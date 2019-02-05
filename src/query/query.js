import getSelections from './getSelections';

function getQuery (info, context) {
  let query = 'query {\n';
  query += getSelections(
    info,
    context,
    info.operation.selectionSet.selections,
    info.schema.getQueryType(),
    '  ',
    true
  )
  return query + '}'
}

function resolveQuery (
  context,
  info
) {
  let req = info.operation.req;
  if (!req) {
    const query = getQuery(info, context);
    req = info.operation.req = context.server.query(query)
  }
  return req
}

export default function query (
  source,
  context,
  info
) {
  if (source) {
    return Promise.resolve(source)
  }
  return resolveQuery(context, info)
}
