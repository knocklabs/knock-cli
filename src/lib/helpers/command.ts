export const formatCommandScope = (flags: {
  environment?: string;
  branch?: string;
}): string => {
  const { environment, branch } = flags;

  if (branch) return `\`${branch}\` branch`;
  if (environment) return `\`${environment}\` environment`;

  return "account default environment";
};
