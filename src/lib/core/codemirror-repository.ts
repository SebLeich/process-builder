import { javascript } from "@codemirror/lang-javascript";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Text } from "@codemirror/state";
import { MethodEvaluationStatus } from "../process-builder/globals/method-evaluation-status";

export class CodemirrorRepository {

    static evaluateCustomMethod(state?: EditorState, text?: Text): MethodEvaluationStatus {

        if(!state){
            if(!text) throw('no state and no text passed');

            state = EditorState.create({
                doc: text,
                extensions: [
                    javascript()
                ]
            });
        }

        let node = syntaxTree(state).resolveInner(0);
        let functions = node.getChildren("FunctionDeclaration");
        for (let func of functions) {

            let variableDef = func.getChild("VariableDefinition");
            if (!variableDef) continue;

            let functionName = state.doc.slice(variableDef.from, variableDef.to);
            if ((functionName as any).text[0] !== 'main') continue;

            let block = func.getChild('Block');
            let returnStatement = block?.getChild('ReturnStatement') ?? undefined;
            return returnStatement ? MethodEvaluationStatus.ReturnValueFound : MethodEvaluationStatus.NoReturnValue;
        }
        return MethodEvaluationStatus.NoMainMethodFound;
    }

}