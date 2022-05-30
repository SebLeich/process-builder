export interface IParamKeyValue {
    type: 'number' | 'string' | 'boolean' | 'object';
    name: string;
    typeDef: null | undefined | IParamKeyValue[];
}
