import { GraphQLNonNull, GraphQLObjectType, GraphQLList, Kind } from 'graphql';

import invariant from 'invariant';

export function unwrap (type) {
  if (type instanceof GraphQLNonNull) {
    return unwrap(type.ofType)
  }
  if (type instanceof GraphQLList) {
    return unwrap(type.ofType)
  }
  return type
}

export function unwrapNonNull (type) {
  if (type instanceof GraphQLNonNull) return type.ofType
  return type
}

export function isConnection (type) {
  if (type instanceof GraphQLObjectType) {
    return type.name.endsWith('Connection')
  }
  return false
}

export function findSelections (
  selections,
  name
) {
  const selection = selections.find(selection => {
    return selection.kind === 'Field' && selection.name.value === name
  })
  if (!selection) return []
  invariant(
    selection.kind === 'Field' && selection.selectionSet,
    'Selection should be of kind Field with a selectionSet'
  )
  return selection.selectionSet.selections
}

export function getConnectionType (type) {
  const edgeType = unwrap(type.getFields()['edges'].type)
  invariant(
    edgeType instanceof GraphQLObjectType,
    'Edge type is not an object type.'
  )
  const nodeType = edgeType.getFields()['node'].type
  invariant(
    nodeType instanceof GraphQLObjectType,
    'Node type is not an object type.'
  )
  return nodeType
}

export function flattenSelections (
  selections,
  info
) {
  let flattened = []
  selections.forEach(selection => {
    if (selection.kind === 'FragmentSpread') {
      const fragment = info.fragments[selection.name.value]
      flattened = flattened.concat(fragment.selectionSet.selections)
    } else {
      flattened.push(selection)
    }
  })
  return flattened
}

export function getFields (type) {
  const fields = type.getFields()
  return Object.keys(fields).map(key => fields[key])
}

export function getValue (info, node) {
  switch (node.kind) {
    case Kind.STRING:
      return node.value
    case Kind.INT:
      return parseInt(node.value, 10)
    case Kind.FLOAT:
      return parseFloat(node.value)
    case Kind.BOOLEAN:
      return node.value
    case Kind.ENUM:
      return node.value
    case Kind.LIST:
      return node.values.map(value => getValue(info, value))
    case Kind.OBJECT:
      const object = {}
      node.fields.forEach(field => {
        object[field.name.value] = getValue(info, field.value)
      })
      return object
    case Kind.VARIABLE:
      invariant(info, 'Resolve info required to evaluate variables value.')
      return info.variableValues[node.name.value]
    default:
      return null
  }
}

export function getArguments (
  info,
  args
) {
  const result = {}
  args.forEach(arg => {
    result[arg.name.value] = getValue(info, arg.value)
  })
  return result
}

export function lowerCamelCase (str) {
  return str[0].toLowerCase() + str.substr(1)
}

export function upperCamelCase (str) {
  return str[0].toUpperCase() + str.substr(1)
}

export function quoteValue (value) {
  if (typeof value === 'string') {
    return `"${value}"`
  }
  return String(value)
}
