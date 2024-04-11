import { ChatModelManager } from '@/managers';
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserRole } from '@/types/admin';
import { getSession } from '@/utils/session';
import { ModelDefaultTemplates } from '@/types/template';
import { ModelVersions } from '@/types/model';
import { badRequest, internalServerError } from '@/utils/error';
import { addAsterisk, checkKey } from '@/utils/common';
import { ChatModels } from '@prisma/client';
import { apiHandler } from '@/middleware/api-handler';
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 5,
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await getSession(req.cookies);
  if (!session) {
    return res.status(401).end();
  }
  const role = session.role;
  if (role !== UserRole.admin) {
    res.status(401).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const { all } = req.query;
      const models = await ChatModelManager.findModels(!!all);
      const data = models.map((x: ChatModels) => {
        const apiConfig = JSON.parse(x.apiConfig);
        return {
          rank: x.rank,
          modelId: x.id,
          modelVersion: x.modelVersion,
          name: x.name,
          type: x.type,
          enabled: x.enabled,
          fileServerId: x.fileServerId,
          fileConfig: x.fileConfig,
          modelConfig: x.modelConfig,
          apiConfig: JSON.stringify({
            appId: addAsterisk(apiConfig?.appId),
            apiKey: addAsterisk(apiConfig?.apiKey),
            secret: addAsterisk(apiConfig?.secret),
            version: apiConfig?.version,
            host: apiConfig.host,
            organization: apiConfig?.organization,
            type: apiConfig?.type,
          }),
          priceConfig: x.priceConfig,
        };
      });
      return data;
    } else if (req.method === 'PUT') {
      const {
        modelId,
        name,
        enabled,
        fileServerId,
        fileConfig,
        modelConfig,
        apiConfig: apiConfigJson,
        priceConfig,
      } = req.body;
      const model = await ChatModelManager.findModelById(modelId);
      if (!model) {
        res.status(400).end('Model is not Found!');
        return;
      }

      let apiConfig = JSON.parse(apiConfigJson);
      apiConfig.appId = checkKey(model?.apiConfig.apiKey, apiConfig.appId);
      apiConfig.apiKey = checkKey(model?.apiConfig.apiKey, apiConfig.apiKey);
      apiConfig.secret = checkKey(model?.apiConfig.secret, apiConfig.secret);

      const data = await ChatModelManager.updateModel(
        modelId,
        name,
        enabled,
        fileServerId,
        fileConfig,
        JSON.stringify(apiConfig),
        modelConfig,
        priceConfig
      );
      return data;
    } else if (req.method === 'POST') {
      const {
        modelVersion,
        name,
        enabled,
        fileServerId,
        priceConfig,
        modelConfig,
        apiConfig,
        fileConfig,
      } = req.body;

      const model = await ChatModelManager.findModelByName(name);
      if (model) {
        res.status(400).end('Model name is exist!');
        return;
      }

      const template = ModelDefaultTemplates[modelVersion as ModelVersions];

      if (!template) {
        res.status(400).end('Model is not Found!');
        return;
      }

      const data = await ChatModelManager.createModel(
        template.type,
        modelVersion,
        name,
        enabled,
        fileServerId,
        fileConfig,
        apiConfig,
        modelConfig,
        priceConfig
      );
      return data;
    } else if (req.method === 'DELETE') {
      const { id } = req.query as { id: string };
      const model = await ChatModelManager.findModelById(id);
      if (model) {
        await ChatModelManager.deleteModelById(id);
      }
      return badRequest(res, 'Model is not Found!');
    }
  } catch (error) {
    console.error(error);
    return internalServerError(res);
  }
};

export default apiHandler(handler);
