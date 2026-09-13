/** Evita injeção de fórmulas e preserva delimitadores na exportação para planilhas. */
export function celulaCsv(valor: string | number | boolean | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);
  if (typeof valor === "string" && /^\s*[=+\-@]/.test(texto)) texto = `'${texto}`;
  if (/[";\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function linhaCsv(valores: Array<string | number | boolean | null | undefined>): string {
  return valores.map(celulaCsv).join(";");
}
