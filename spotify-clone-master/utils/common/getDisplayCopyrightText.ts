import { COPYRIGHT_SIGN, SOUND_COPYRIGHT_SIGN } from '@config';

export const getDisplayCopyrightText = (text: string, type: string) => {
  if (text[0] === COPYRIGHT_SIGN || text[0] === SOUND_COPYRIGHT_SIGN) {
    return text;
  }

  if (type === 'P') {
    return `${SOUND_COPYRIGHT_SIGN} ${text}`;
  }

  if (type === 'C') {
    return `${COPYRIGHT_SIGN} ${text}`;
  }

  return text;
};
