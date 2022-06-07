import { javascript } from "@codemirror/lang-javascript";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Text } from "@codemirror/state";
import { MethodEvaluationStatus } from "../process-builder/globals/method-evaluation-status";
import { Tree, SyntaxNode } from 'node_modules/@lezer/common/dist/tree';
import { insertBracket } from "@codemirror/autocomplete";
import { deleteLine } from "@codemirror/commands";

export class CodemirrorRepository {

    static evaluateCustomMethod(state?: EditorState, text?: Text): MethodEvaluationStatus {

        if (!state) {
            if (!text) throw ('no state and no text passed');

            state = EditorState.create({
                doc: text,
                extensions: [
                    javascript()
                ]
            });
        }

        let tree = syntaxTree(state);
        let mainMethod = this.getMainMethod(tree, state, text);
        if (!mainMethod.node) return MethodEvaluationStatus.NoMainMethodFound;

        let block = mainMethod.node.getChild('Block');
        let returnStatement = block?.getChild('ReturnStatement') ?? undefined;
        return returnStatement ? MethodEvaluationStatus.ReturnValueFound : MethodEvaluationStatus.NoReturnValue;

    }

    static getMainMethod(tree?: Tree, state?: EditorState, text?: Text): ISyntaxNodeResponse {

        if (!state) {
            if (!text) throw ('no state and no text passed');

            state = EditorState.create({
                doc: text,
                extensions: [
                    javascript()
                ]
            });
        }

        if (!tree) tree = syntaxTree(state);

        let node = tree.resolveInner(0);
        let functions = node.getChildren("FunctionDeclaration");
        for (let func of functions) {

            let variableDef = func.getChild("VariableDefinition");
            if (!variableDef) continue;

            let functionName = state.doc.slice(variableDef.from, variableDef.to);
            if ((functionName as any).text[0] === 'main') {
                return { 'node': func, 'tree': tree };
            }
        }

        return { 'node': null, 'tree': tree };

    }

}

export interface ISyntaxNodeResponse {
    node: SyntaxNode | null;
    tree: Tree;
}