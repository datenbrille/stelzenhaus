export interface GiebelBoard {
  length: number;
  quantity: number;
}

export function calculateGiebelBoards(
  base: number,
  height: number,
  boardWidth: number,
  count: number
): GiebelBoard[] {
  const boards: GiebelBoard[] = [];
  let y = 0;
  while (y < height) {
    const length = Math.ceil(base * (1 - y / height));
    if (length < 50) break;
    boards.push({ length, quantity: count });
    y += boardWidth;
  }
  return boards;
}
