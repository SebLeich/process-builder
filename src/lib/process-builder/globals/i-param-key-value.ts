export interface IParamKeyValue {
    type: 'number' | 'string' | 'boolean' | 'object' | 'array';
    name: string;
    typeDef: null | undefined | IParamKeyValue[];
    defaultValue?: any;
}
