import { javascript } from "@codemirror/lang-javascript";
import { syntaxTree } from "@codemirror/language";
import { EditorState, Text } from "@codemirror/state";
import { MethodEvaluationStatus } from "../process-builder/globals/method-evaluation-status";
import { Tree, SyntaxNode } from 'node_modules/@lezer/common/dist/tree';

export class CodemirrorRepository {

    static evaluateCustomMethod(state?: EditorState, text?: string[] | string): MethodEvaluationStatus {

        let convertedText = Array.isArray(text)? text.join('\n'): text;

        if (!state) {
            if (!text) throw ('no state and no text passed');

            state = EditorState.create({
                doc: convertedText,
                extensions: [
                    javascript()
                ]
            });
        }

        let tree = syntaxTree(state);
        let mainMethod = this.getMainMethod(tree, state, text);
        if (!mainMethod.node) return MethodEvaluationStatus.NoMainMethodFound;

        let arrowFunction = mainMethod.node.getChild('ArrowFunction');
        let block = arrowFunction ? arrowFunction.getChild('Block'): mainMethod.node.getChild('Block');
        let returnStatement = block?.getChild('ReturnStatement') ?? undefined;
        return returnStatement ? MethodEvaluationStatus.ReturnValueFound : MethodEvaluationStatus.NoReturnValue;

    }

    static getMainMethod(tree?: Tree, state?: EditorState, text?: string[] | string): ISyntaxNodeResponse {

        let convertedText = Array.isArray(text)? text.join('\n'): text;

        if (!state) {
            if (!text) throw ('no state and no text passed');

            state = EditorState.create({
                doc: convertedText,
                extensions: [
                    javascript()
                ]
            });
        }

        if (!tree) tree = syntaxTree(state);

        let node = tree.resolveInner(0);
        let functions = [...node.getChildren("ExpressionStatement")];

        return { 'node': functions.length > 0? functions[functions.length - 1]: null, 'tree': tree };

    }

}

export interface ISyntaxNodeResponse {
    node: SyntaxNode | null;
    tree: Tree;
}