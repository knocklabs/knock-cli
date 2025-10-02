export const formatCommandScope = (flags: {
  environment: string;
  branch?: string;
}): string => {
  const { environment, branch } = flags;

  return `\`${branch ?? environment}\` ${branch ? "branch" : "environment"}`;
};
