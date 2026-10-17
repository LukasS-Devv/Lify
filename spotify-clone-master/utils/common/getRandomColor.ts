import { BROWSE_CATEGORIES_COLORS } from '@config';

export const getRandomColor = () =>
  BROWSE_CATEGORIES_COLORS[
    Math.floor(Math.random() * BROWSE_CATEGORIES_COLORS.length)
  ];

// export const getRandomColor = () => {
//   const letters = '0123456789ABCDEF';
//   let color = '#';
//   [...Array(6)].forEach(() => {
//     color += letters[Math.floor(Math.random() * 16)];
//   });
//   return color;
// };
