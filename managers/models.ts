import { ChatModels } from '@/db';
import { ChatModelApiConfig } from '@/db/models';
import {
  ChatModelConfig,
  ChatModelFileConfig,
  ModelType,
  ModelVersions,
} from '@/types/model';

export class ChatModelManager {
  static async findModels(findAll: boolean = false) {
    const where = { enable: true };
    return await ChatModels.findAll({
      where: findAll ? {} : where,
      order: [
        ['rank', 'asc'],
        ['createdAt', 'asc'],
      ],
    });
  }

  static async findModelById(id: string) {
    return await ChatModels.findOne({
      where: {
        id,
      },
    });
  }

  static async deleteModelById(id: string) {
    return await ChatModels.destroy({
      where: {
        id,
      },
    });
  }

  static async findModelByName(name: string) {
    return await ChatModels.findOne({
      where: {
        name,
      },
    });
  }

  static async createModel(
    type: ModelType,
    modelVersion: ModelVersions,
    name: string,
    enable: boolean,
    modelConfig: ChatModelConfig,
    apiConfig: ChatModelApiConfig,
    fileConfig: ChatModelFileConfig
  ) {
    return await ChatModels.create({
      type,
      modelVersion,
      name,
      enable,
      modelConfig,
      apiConfig,
      fileConfig,
    });
  }

  static async updateModel(
    id: string,
    name: string,
    enable: boolean,
    modelConfig: ChatModelConfig,
    apiConfig: ChatModelApiConfig,
    fileConfig: ChatModelFileConfig
  ) {
    return await ChatModels.update(
      {
        name,
        enable,
        modelConfig,
        apiConfig,
        fileConfig,
      },
      {
        where: { id },
      }
    );
  }
}
