import {
  AvailabilityEntry,
  CXChildVisitResult,
  CXCursor,
  CXCursorKind,
  CXObjCPropertyAttrKind,
} from "../deps.ts";
import {
  CXCursorRepresentation,
  getAvailability,
  NamedDecl,
} from "./common.ts";
import { processCXType, TypeMetadata } from "./type.ts";

/**
 * @see https://clang.llvm.org/doxygen/classclang_1_1ObjCTypeParamDecl.html
 * @see https://clang.llvm.org/doxygen/classclang_1_1ParmVarDecl.html
 */
export interface ParameterDecl extends NamedDecl {
  type: TypeMetadata;
  typeString: string;
}

/**
 * @see https://clang.llvm.org/doxygen/classclang_1_1ObjCMethodDecl.html
 * @see https://clang.llvm.org/doxygen/classclang_1_1CXXMethodDecl.html
 */
export interface MethodDecl extends NamedDecl {
  parameters: ParameterDecl[];
  result: TypeMetadata;
  typeString: string;
  availability: AvailabilityEntry[];
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1ObjCPropertyDecl.html */
export interface PropertyDecl extends NamedDecl {
  type: TypeMetadata;
  getter: string;
  setter: string;
  static: boolean;
  readonly: boolean;
  nonatomic: boolean;
  weak: boolean;
  availability: AvailabilityEntry[];
}

/**
 * Represents CXCursor_ObjCClassRef or CXCursor_ObjCSuperClassRef.
 * @see https://clang.llvm.org/doxygen/Index_8h_source.html#l01137
 */
export interface ClassRef extends CXCursorRepresentation {
  module: string;
}

/** @see https://clang.llvm.org/doxygen/classclang_1_1ObjCInterfaceDecl.html */
export interface InterfaceDecl extends NamedDecl {
  file: string;
  super: ClassRef | null;
  properties: PropertyDecl[];
  instanceMethods: MethodDecl[];
  classMethods: MethodDecl[];
  availability: AvailabilityEntry[];
  typeString: string;
}

export function processInterface(cursor: CXCursor): InterfaceDecl | undefined {
  let availability;
  if (!(availability = getAvailability(cursor))) return;

  const interfaceDecl: InterfaceDecl = {
    file: cursor.getLocation().getFileLocation().file.getName(),
    name: cursor.getSpelling(),
    super: null,
    properties: [],
    instanceMethods: [],
    classMethods: [],
    availability,
    typeString: cursor.getPrettyPrinted().split("@interface ")[0],
  };

  cursor.visitChildren((cursor, _) => {
    switch (cursor.kind) {
      case CXCursorKind.CXCursor_ObjCSuperClassRef:
        interfaceDecl.super = {
          name: cursor.getSpelling(),
          module: cursor.getLocation().getFileLocation().file.getName(),
        };
        break;

      case CXCursorKind.CXCursor_ObjCPropertyDecl:
        processProperty(cursor, interfaceDecl.properties);
        break;

      case CXCursorKind.CXCursor_ObjCInstanceMethodDecl:
        processMethod(cursor, interfaceDecl.instanceMethods);
        break;

      case CXCursorKind.CXCursor_ObjCClassMethodDecl:
        processMethod(cursor, interfaceDecl.classMethods);
        break;

      default:
        break;
    }

    return CXChildVisitResult.CXChildVisit_Continue;
  });

  return interfaceDecl;
}

export function processProperty(cursor: CXCursor, properties: PropertyDecl[]) {
  let availability;
  if (!(availability = getAvailability(cursor))) return;

  const attrs = cursor.getObjCPropertyAttributes();
  const propertyDecl: PropertyDecl = {
    name: cursor.getSpelling(),
    type: processCXType(cursor.getType()!),
    getter: cursor.getObjCPropertyGetterName(),
    setter: cursor.getObjCPropertySetterName(),
    static: (attrs & CXObjCPropertyAttrKind.CXObjCPropertyAttr_class) !== 0,
    readonly:
      (attrs & CXObjCPropertyAttrKind.CXObjCPropertyAttr_readonly) !== 0,
    nonatomic:
      (attrs & CXObjCPropertyAttrKind.CXObjCPropertyAttr_nonatomic) !== 0,
    weak: (attrs & CXObjCPropertyAttrKind.CXObjCPropertyAttr_weak) !== 0,
    availability,
  };

  properties.push(propertyDecl);
}

export function processMethod(cursor: CXCursor, methodDecls: MethodDecl[]) {
  let availability;
  if (!(availability = getAvailability(cursor))) return;

  const methodDecl: MethodDecl = {
    name: cursor.getSpelling(),
    parameters: [],
    result: processCXType(cursor.getResultType()!),
    typeString: cursor.getPrettyPrinted(),
    availability,
  };

  for (let i = 0; i < cursor.getNumberOfArguments(); i++) {
    const arg = cursor.getArgument(i)!;
    const param: ParameterDecl = {
      name: arg.getSpelling(),
      type: processCXType(arg.getType()!),
      typeString: arg.getPrettyPrinted(),
    };

    methodDecl.parameters.push(param);
  }

  methodDecls.push(methodDecl);
}
