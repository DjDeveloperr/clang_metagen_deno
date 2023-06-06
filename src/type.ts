import { CXType } from "../deps.ts";

export interface TypeMetadata {
  name: string;
  file?: string;
  kind: string;
  nullable: NullabilityKind;
  canonical: string;
  canonicalKind: string;
  size: number;
  alignment: number;
  elementType?: TypeMetadata;
  pointeeType?: TypeMetadata;
  arraySize?: number;
  block?: {
    returnType?: TypeMetadata;
    parameters: TypeMetadata[];
  };
}

export enum NullabilityKind {
  NON_NULL = 0,
  NULLABLE = 1,
  UNSPECIFIED = 2,
  INVALID = 3,
  NULLABLE_RESULT = 4,
}

export function processCXType(type: CXType): TypeMetadata {
  const canonicalType = type.getCanonicalType();
  const canonicalKind = canonicalType.getKindSpelling();
  const elementType = type.getArrayElementType();
  const pointeeType = type.getPointeeType();
  const arraySize = type.getArraySize();

  return {
    name: type.getSpelling(),
    file: type.getTypeDeclaration()?.getDefinition()?.getLocation().getFileLocation().file.getName(),
    kind: type.getKindSpelling(),
    nullable: type.getNullability() as unknown as NullabilityKind,
    canonical: canonicalType.getSpelling(),
    canonicalKind,
    size: type.getSizeOf(),
    alignment: type.getAlignOf(),
    elementType: elementType ? processCXType(elementType) : undefined,
    pointeeType: pointeeType ? processCXType(pointeeType) : undefined,
    arraySize: arraySize < 0 ? undefined : arraySize,
    block: canonicalKind === "BlockPointer" && pointeeType
      ? {
        returnType: pointeeType.getResultType()
          ? processCXType(pointeeType.getResultType()!)
          : undefined,
        parameters: Array.from(
          { length: pointeeType.getNumberOfArgumentTypes() },
          (_, i) => processCXType(pointeeType.getArgumentType(i)!),
        ),
      }
      : undefined,
  };
}
