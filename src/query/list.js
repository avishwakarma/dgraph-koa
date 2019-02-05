import invariant from 'invariant';
import query from './query';

export default function resolve (
  source,
  args,
  context,
  info
) {
  return query(source, context, info).then(result => {
    invariant(info.path && info.path.key, 'No path')
    const nodes = result[String(info.path.key)] || []
    return nodes.filter(node => !!node.__typename)
  })
}
