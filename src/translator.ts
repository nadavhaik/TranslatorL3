import {
    AppExp, Binding,
    CExp,
    Exp, IfExp, isAppExp, isBinding,
    isBoolExp, isCompoundExp, isDefineExp, isIfExp,
    isLitExp,
    isNumExp,
    isPrimOp, isProcExp,
    isStrExp, isVarDecl,
    isVarRef, LitExp, makeAppExp, makePrimOp,
    parseL3,
    parseL3Program, PrimOp, ProcExp,
    Program, VarDecl
} from "../imp/L3-ast"
import * as R from "ramda";

import {Result, makeFailure, isFailure, bind, Ok, makeOk, mapResult} from "../shared/result";
import * as fs from "fs";
import {applyEnv} from "../imp/L3-env";
import {Closure, CompoundSExp, isEmptySExp, isSymbolSExp, SymbolSExp, Value} from "../imp/L3-value";
import {is} from "ramda";

const TYPES_FILE: string = ".\\L3Types.py"
const INPUT_FILE: string = "C:\\Degree\\Year 2\\Sem 2\\PPL\\assignment-2-ppl\\src\\q2.l3"
const OUTPUT_FILE: string = "C:\\Degree\\Year 2\\Sem 2\\PPL\\Translator\\q2.py"

const isNotEmptySymbolExp: (e: any) => boolean = (e: any) => isLitExp(e) &&  isSymbolSExp(e.val)
const isEmptySymbolExp: (e: any) => boolean = (e: any) => isLitExp(e) && isEmptySExp(e.val)
const escapeQuotes: (s: string) => string = (s: string) => s.replace(/"/gi, "\\\"")
const l3StringToPythonString: (s: string) => string = (s: string) => "L3String(\"" + escapeQuotes(s) + "\")"
const l3SymbolToPythonString: (s: string) => string = (s: string) => "L3Symbol(\"" + escapeQuotes(s) + "\")"
const boolToPythonString: (b: boolean) => string = (b: boolean) => b ? "True" : "False"

const l3IfToPythonString: (e: IfExp) => string = (e: IfExp) => "(" + translateExpToPython(e.then) + ")" + " if " + "(" +
    translateExpToPython(e.test) + ")" + " else " + "(" + translateExpToPython(e.alt) + ")"
const fixIllegalCharsInVars: (varName: string) => string = (varName: string) =>
    varName.replace(/-/gi, "_").replace(/>/gi, "_").replace(/\?/gi, "_question_mark")

const l3ProcToLambdaPythonString: (e: ProcExp) => string = (e: ProcExp) => {
  let s = "lambda "
  for(let i=0; i<e.args.length; i++) {
      s += translateExpToPython(e.args[i])
      if(i < e.args.length-1)
          s += ", "
  }
  s += " : ";

  if(e.body.length > 1)
      throw "To many arguments for lambda"
  s += translateExpToPython(e.body[0]) + " "

  return s
}


const pythonPairArithmetic: (operator: string, rands: CExp[]) => string = (operator: string, rands: CExp[]) => {
    if(rands.length != 2)
        throw "Cannot apply " + operator + " on " + rands.length + " parameters"
    return "(" + translateExpToPython(rands[0]) + " " + operator + " " + translateExpToPython(rands[1]) + ")"
}

const pythonArithmetic: (operator: string, rands: CExp[]) => string = (operator: string, rands: CExp[]) => {
    if(rands.length === 0)
        throw "Operator " + operator + " has no parameters!"
    if(rands.length === 1)
        return translateExpToPython(rands[0])
    let s = "("
    for(let i=0; i<rands.length; i++) {
        s += translateExpToPython(rands[i])
        if(i < rands.length-1)
            s += " " + operator + " "
    }
    s += ")"
    return s
}

const pythonNot: (rands: CExp[]) => string = (rands: CExp[]) => {
    if(rands.length != 1)
        throw "Cannot apply 'not' operator on " + rands.length + " parameters"

    return "(not " + translateExpToPython(rands[0]) + ")"
}

const pythonIsInstance: (pythonClass: string, rands: CExp[]) => string = (pythonClass: string, rands: CExp[]) => {
    if(rands.length != 1)
        throw "Cannot apply 'isinsance' operator on " + rands.length + " parameters"
    return "issubclass(type(" + translateExpToPython(rands[0]) + "), " + pythonClass + ")"
}

const pythonGetFromPair: (index: number, rands: CExp[]) => string = (index: number, rands: CExp[]) => {
    if(rands.length != 1)
        throw "Cannot apply '[ " + index + "]' operator on " + rands.length + " parameters"
    return translateExpToPython(rands[0]) + "[" + index + "]"
}

const pythonIsNumeric: (rands: CExp[]) => string = (rands: CExp[]) => {
    if(rands.length != 1)
        throw "Cannot apply 'isnumeric' operator on " + rands.length + " parameters"
    return "(" + pythonIsInstance("int", rands) + " or " + pythonIsInstance("float", rands) + ")"
}

const pythonApplyFunction: (functionName: string, rands: CExp[]) => string = (functionName: string, rands: CExp[]) => {
    let s = functionName + "("
    for(let i=0; i<rands.length; i++) {
        s += translateExpToPython(rands[i])
        if(i<rands.length-1)
            s += ", "
    }
    s += ")"

    return s
}

const pythonCreateList: (rands: CExp[]) => string = (rands: CExp[]) => pythonApplyFunction("L3List", rands)
const pythonCreatePair: (rands: CExp[]) => string = (rands: CExp[]) => pythonPairArithmetic(",", rands)

const l3AppToPythonString: (e: AppExp) => string = (e: AppExp) => {
    if (isPrimOp(e.rator)) {
        switch (e.rator.op) {
            case "+":
            case "-":
            case "*":
            case "/":
            case "and":
            case "or":
                return pythonArithmetic(e.rator.op, e.rands)
            case "<":
            case ">":
                return pythonPairArithmetic(e.rator.op, e.rands)
            case "=":
            case "eq?":
                return pythonPairArithmetic("==", e.rands)
            case "not":
                return pythonNot(e.rands)
            case "string?":
                return pythonIsInstance("L3String", e.rands)
            case "symbol?":
                return pythonIsInstance("L3Symbol", e.rands)
            case "pair?":
                return pythonIsInstance("tuple", e.rands)
            case "boolean?":
                return pythonIsInstance("bool", e.rands)
            case "number?":
                return pythonIsNumeric(e.rands)
            case "car":
                return pythonGetFromPair(0, e.rands)
            case "cdr":
                return pythonGetFromPair(1, e.rands)
            case "string=?":
                return l3AppToPythonString(makeAppExp(makePrimOp("and"), [makeAppExp(makePrimOp("string?"), [e.rands[0]]),
                    makeAppExp(makePrimOp("="), e.rands)]))
            case "cons":
                return pythonCreatePair(e.rands)
            case "list":
                return pythonCreateList(e.rands)
        }
    }
    if(isVarRef(e.rator))
        return pythonApplyFunction(fixIllegalCharsInVars(e.rator.var), e.rands)

    throw "Unrecognized operator: " + e.rator
}

const translateExpToPython: (exp: Exp | VarDecl) => string = (exp: Exp | VarDecl | Binding) => {
    if(isDefineExp(exp))
        return translateExpToPython(exp.var) + " = " + translateExpToPython(exp.val)
    if(isNumExp(exp))
        return exp.val.toString()
    if(isBoolExp(exp))
        return boolToPythonString(exp.val)
    if(isStrExp(exp))
        return l3StringToPythonString(exp.val)
    if(isNotEmptySymbolExp(exp))
        return l3SymbolToPythonString(((exp as LitExp).val as SymbolSExp).val)
    if(isEmptySymbolExp(exp))
        return l3SymbolToPythonString("()")
    if(isIfExp(exp))
        return l3IfToPythonString(exp)
    if(isVarRef(exp) || isVarDecl(exp))
        return fixIllegalCharsInVars(exp.var)
    if(isProcExp(exp))
        return l3ProcToLambdaPythonString(exp)
    if(isAppExp(exp))
        return l3AppToPythonString(exp)
    if(isBinding(exp))
        return translateExpToPython(exp.var) + " = " + translateExpToPython(exp.val)

    throw "Unrecognized expression" + exp

}

const translateProgramToPython: (program: Program) => string = (program: Program) =>  {
    let pythonCode = ""

    program.exps.forEach((exp: Exp) => {
        pythonCode += translateExpToPython(exp)
        pythonCode += "\n"
    })

    return pythonCode

}

const main = (): void => {
    const parsedRes: Result<Program> = parseL3("(L3 " + fs.readFileSync(INPUT_FILE,  {encoding: 'utf-8'}) + ")")
    if(isFailure(parsedRes))
        throw parsedRes.message

    const parsedProgram: Program = (parsedRes as Ok<Program>).value;
    let pythonCode = fs.readFileSync(TYPES_FILE, {encoding: 'utf-8'}) +
        "\n" + translateProgramToPython(parsedProgram);
    fs.writeFileSync(OUTPUT_FILE, pythonCode)


}

main()