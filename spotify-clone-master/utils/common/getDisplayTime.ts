export const getDisplayTime = (totalDuration: number | '') => {
  if (!totalDuration) {
    return '';
  }
  const durationM = totalDuration / 1000 / 60;

  if (durationM > 60) {
    return `${Math.floor(durationM / 60)}h ${Math.ceil(durationM % 60)}min`;
  }

  if (durationM % 60 === 0) {
    return `${Math.ceil(durationM / 60)}h`;
  }

  return `${Math.ceil(durationM)}min`;
};
