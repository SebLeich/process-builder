export default {
    "name": "process builder extension",
    "uri": "https://www.sebleich.com/schema/xml/process-builder-extension",
    "prefix": "slpb",
    "xml": {
        "tagAlias": "lowerCase"
    },
    "types": [
        {
            "name": "ActivityExtension",
            "properties": [
                {
                    "name": "functionId",
                    "isAttr": true,
                    "type": "Integer"
                }
            ]
        }, {
            "name": "GatewayExtension",
            "properties": [
                {
                    "name": "gatewayType",
                    "isAttr": true,
                    "type": "String"
                }
            ]
        }
    ],
    "emumerations": [],
    "associations": []
}
