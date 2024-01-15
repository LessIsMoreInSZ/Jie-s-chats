export interface Model {
  id: ModelIds;
  name: string;
  maxLength: number;
  tokenLimit: number;
}

export enum ModelIds {
  GPT_3_5 = 'gpt-3.5-turbo',
  GPT_4 = 'gpt-4',
  GPT_4_32K = 'gpt-4-32k',
  GPT_4_Vision = 'gpt-4-vision',
  ERNIE_Bot_4 = 'ERNIE-Bot-4',
  ERNIE_Bot_8K = 'ERNIE-Bot-8K',
  QWen_Vl_Plus = 'qwen-vl-plus',
}

export const Models = [
  {
    id: ModelIds.GPT_3_5,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  {
    id: ModelIds.GPT_4,
    name: 'GPT-4',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  {
    id: ModelIds.GPT_4_Vision,
    name: 'GPT-4-VISION',
    maxLength: 96000,
    tokenLimit: 32000,
  },
  {
    id: ModelIds.ERNIE_Bot_4,
    name: 'ERNIE-Bot-4',
    maxLength: 128,
    tokenLimit: 4096,
  },
  {
    id: ModelIds.ERNIE_Bot_8K,
    name: 'ERNIE-Bot-8K',
    maxLength: 512,
    tokenLimit: 8192,
  },
  {
    id: ModelIds.QWen_Vl_Plus,
    name: 'QianWen-VL-Plus',
    maxLength: 512,
    tokenLimit: 8192,
  },
];

export const ModelMaps: Record<ModelIds, Model> = Models.reduce(
  (map, model) => {
    map[model.id] = model;
    return map;
  },
  {} as Record<ModelIds, Model>
);
