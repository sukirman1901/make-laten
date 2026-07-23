export const typescriptConfig = {
  name: 'typescript',
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  query: `
    (function_declaration
      name: (identifier) @name
      parameters: (formal_parameters) @params
      return_type: (type_annotation)? @return
      body: (statement_block) @body) @function

    (class_declaration
      name: (type_identifier) @name
      body: (class_body) @body) @class

    (method_definition
      name: (property_identifier) @name
      parameters: (formal_parameters) @params
      return_type: (type_annotation)? @return
      body: (statement_block) @body) @method

    (export_statement
      declaration: (function_declaration) @exported_function)

    (export_statement
      declaration: (class_declaration) @exported_class)
  `
}
