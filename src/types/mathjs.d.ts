// The pinned upstream mathjs/@types/mathjs combination does not expose
// declarations to TypeScript 4.6 in the CI environment. Keep the upstream
// runtime dependency unchanged while allowing the legacy imports to compile.
declare module "mathjs";
