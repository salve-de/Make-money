import Ajv, { type ValidateFunction } from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
export function compileParser<T>(schema: object, label: string) {
  const validate: ValidateFunction<T> = ajv.compile<T>(schema);
  return (input: unknown): T => {
    if (!validate(input)) {
      // Never include the input payload: it can contain private source data.
      const paths = validate.errors?.map((error) => `${error.instancePath || '/'} ${error.keyword}`).join(', ');
      throw new Error(`Invalid ${label}: ${paths}`);
    }
    return input;
  };
}
