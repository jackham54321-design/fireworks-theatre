/** A minimal POSIX tar writer: no archive library or network dependency. */
export function tarHeader(name, size) {
  if (
    new TextEncoder().encode(name).length > 100 ||
    name.startsWith("/") ||
    name.split("/").includes("..")
  ) {
    throw new Error("Invalid source archive path");
  }
  const header = new Uint8Array(512);
  const write = (offset, text) =>
    header.set(new TextEncoder().encode(text), offset);
  const octal = (value, width) =>
    value.toString(8).padStart(width - 1, "0") + "\0";
  write(0, name);
  write(100, octal(0o644, 8));
  write(108, octal(0, 8));
  write(116, octal(0, 8));
  write(124, octal(size, 12));
  write(136, octal(0, 12));
  write(148, "        ");
  write(156, "0");
  write(257, "ustar\0");
  write(263, "00");
  write(
    148,
    header
      .reduce((sum, value) => sum + value, 0)
      .toString(8)
      .padStart(6, "0") + "\0 ",
  );
  return header;
}

export async function exportSource(files, read, onProgress = () => {}) {
  const entries = Object.entries(files);
  let index = 0;
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        if (index === entries.length) {
          controller.enqueue(new Uint8Array(1024));
          controller.close();
          return;
        }
        const [name, key] = entries[index++];
        const data = await read(key);
        controller.enqueue(tarHeader("fireworks-theatre/" + name, data.length));
        controller.enqueue(data);
        const padding = (512 - (data.length % 512)) % 512;
        if (padding) controller.enqueue(new Uint8Array(padding));
        onProgress(index, entries.length);
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(stream.pipeThrough(new CompressionStream("gzip"))).blob();
}
