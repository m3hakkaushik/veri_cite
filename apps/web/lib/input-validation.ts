export function validateDocument(file: { name: string; size: number }) {
  if (!/\.(pdf|bib)$/i.test(file.name))
    return { code: "file-type", message: "Choose a PDF or .bib file." };
  if (!file.size)
    return {
      code: "empty-file",
      message: "This file is empty. Choose another.",
    };
  const limit = /\.bib$/i.test(file.name) ? 2 : 20;
  if (file.size > limit * 1024 * 1024)
    return {
      code: "file-size",
      message: `This file exceeds the ${limit} MB limit.`,
    };
  return null;
}
