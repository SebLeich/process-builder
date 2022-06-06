import { IParamKeyValue } from "../process-builder/globals/i-param-key-value";

export class ProcessBuilderRepository {

    private static _randomValueGenerator = {
        'array': () => { return [] },
        'object': () => { return {} },
        'string': () => btoa(Math.random().toString()).slice(0, 5),
        'number': () => Math.floor(Math.random() * 11),
        'boolean': () => Math.floor(Math.random() * 11) % 2 === 1
    };

    static convertIParamKeyValuesToPseudoObject(values: IParamKeyValue[], parent: any = {}, config: {
        string: () => string | undefined,
        boolean: () => boolean | undefined,
        number: () => number | undefined,
        object: () => object,
        array: () => any[]
    } = {
            string: () => undefined,
            boolean: () => undefined,
            number: () => undefined,
            object: () => { return {} },
            array: () => []
        }): object {

        let index = 0;

        for (let value of values) {

            let defaultValue = value.defaultValue;
            if (!defaultValue) defaultValue = config[value.type]();
            if (!defaultValue) defaultValue = this._randomValueGenerator[value.type]();

            Array.isArray(parent) ? parent.push(defaultValue) : parent[value.name] = defaultValue;
            if (Array.isArray(value.typeDef)) {
                this.convertIParamKeyValuesToPseudoObject(value.typeDef, Array.isArray(parent) ? parent[index] : parent[value.name], config);
            }

            index++;

        }

        return parent;

    }

    static extractObjectIParams(object: object): IParamKeyValue[] {

        let output: IParamKeyValue[] = [];

        for (let entry of Object.entries(object)) {

            // @ts-ignore
            let type: 'array' | 'object' | 'string' | 'number' | 'boolean' = typeof entry[1];
            let name: string | null = entry[0];
            let typeDef: null | undefined | IParamKeyValue[];
            let value: any = undefined;
            if (type === 'object') {
                if (Array.isArray(entry[1])) {
                    type = 'array';
                }
                typeDef = this.extractObjectIParams(entry[1]);
            }
            else value = entry[1];

            output.push({
                name: name,
                type: type,
                defaultValue: value,
                typeDef: typeDef
            } as IParamKeyValue);

        }

        return output;

    }

    static normalizeName(text: string){
        text = text.toLowerCase().replace(/[-_?:*%!;¿\s.]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
        return text.substr(0, 1).toLowerCase() + text.substr(1);
    }

}