import { CreateOptions, DestroyOptions, SaveOptions, InstanceUpdateOptions } from 'sequelize';

export interface WithUserOption {
  userId: number;
}

export type CreateWithUserOptions<T> = CreateOptions<T> & WithUserOption;
export type UpdateWithUserOptions<T> = InstanceUpdateOptions<T> & WithUserOption;
export type DestroyWithUserOptions<T> = DestroyOptions<T> & WithUserOption;
export type SaveWithUserOptions<T> = SaveOptions<T> & WithUserOption;