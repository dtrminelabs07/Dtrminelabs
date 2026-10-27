export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      if (cell.length > 0 || closedQuote) throw new Error("Format CSV tidak valid: tanda kutip berada di posisi yang salah.");
      quoted = true;
    } else if (character === ",") {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      closedQuote = false;
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some(value => value !== "")) rows.push(row);
      row = [];
      cell = "";
      closedQuote = false;
    } else {
      if (closedQuote && character !== "\r") throw new Error("Format CSV tidak valid: ada teks setelah tanda kutip penutup.");
      cell += character;
    }
  }

  if (quoted) throw new Error("Format CSV tidak valid: tanda kutip tidak berpasangan.");
  row.push(cell.replace(/\r$/, ""));
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}
