import { UserResponseType } from '@config';
import { UserModel } from '@models';

export const parseToUser = ({
  id,
  type,
  display_name,
  images,
}: UserResponseType): UserModel => ({
  id: id,
  type: type as UserModel['type'],
  displayName: display_name,
  imageURL: images && images[0] && images[0].url ? images[0].url : '',
});
