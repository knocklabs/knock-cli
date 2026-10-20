/*
 * IMPORTANT:
 *
 * This file is suffixed with `.isomorphic` because the code in this file is
 * meant to run not just in a nodejs environment but also in a browser. For this
 * reason there are some restrictions for which nodejs imports are allowed in
 * this module. See `.eslintrc.json` for more details.
 */

// Replaces node:path, which isomorphic files cannot import, and always joins with "/".

const SEPARATOR_RE = /[/\\]+/;

const isAbsolute = (filePath: string): boolean => /^[/\\]/.test(filePath);

const formatPath = (segments: string[], absolute: boolean): string => {
  const body = segments.join("/");
  if (absolute) return `/${body}`;

  return body || ".";
};

// A relative path keeps a `..` it cannot resolve, and an absolute path stops at the root.
const normalizeSegments = (filePath: string): string[] => {
  const absolute = isAbsolute(filePath);
  const segments: string[] = [];

  for (const segment of filePath.split(SEPARATOR_RE)) {
    if (segment === "" || segment === ".") continue;

    if (segment !== "..") {
      segments.push(segment);
      continue;
    }

    const last = segments[segments.length - 1];
    if (last !== undefined && last !== "..") {
      segments.pop();
    } else if (!absolute) {
      segments.push("..");
    }
  }

  return segments;
};

export const join = (...parts: string[]): string => {
  const joined = parts.filter((part) => part !== "").join("/");
  if (joined === "") return ".";

  return formatPath(normalizeSegments(joined), isAbsolute(joined));
};

export const dirname = (filePath: string): string => {
  const segments = filePath.split(SEPARATOR_RE).filter(Boolean);
  segments.pop();

  return formatPath(segments, isAbsolute(filePath));
};

// Unlike node:path, this ignores the cwd, so both paths must share one base directory.
export const relative = (from: string, to: string): string => {
  const fromSegments = normalizeSegments(from);
  const toSegments = normalizeSegments(to);

  let sharedCount = 0;
  while (
    sharedCount < fromSegments.length &&
    sharedCount < toSegments.length &&
    fromSegments[sharedCount] === toSegments[sharedCount]
  ) {
    sharedCount += 1;
  }

  const parentSegments = fromSegments.slice(sharedCount).map(() => "..");
  return [...parentSegments, ...toSegments.slice(sharedCount)].join("/");
};
