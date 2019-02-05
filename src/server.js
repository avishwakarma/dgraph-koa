import Koa from 'koa';
import mount from 'koa-mount';
import koaGraphQl from 'koa-graphql';

import grpc from 'grpc';

import { DgraphClientStub, DgraphClient, Operation, Mutation } from 'dgraph-js'
import { parse, Source } from 'graphql'

import transformSchema from './transformSchema'
import buildSchema from './buildSchema'
import getInfo from './getInfo'

const _defaultConfig = {
  relay: false,
  debug: true,
  graphiql: true,
  graphiqlUrl: '/graphql',
  dgraph: {
    uri: 'localhost:9080',
    credentials: grpc.credentials.createInsecure()
  }
}
const updateTypeName = 'SchemaUpdate';

class Server {
  _info;
  _debug;
  _config;
  _server;

  init;
  schema;
  relay;

  constructor (config) {

    if(!config) {
      config = _defaultConfig;
    }

    this._config = {
      ..._defaultConfig,
      ...config,
      dgraph: {
        ..._defaultConfig.dgraph,
        ...config.dgraph
      }
    };

    this.app = new Koa();

    this._debug = this._config.debug;
    this.relay = this._config.relay;
    this._server = this._config.server;

    this.clientStub = new DgraphClientStub(
      this._config.dgraph.url,
      this._config.dgraph.credentials
    );

    this.client = new DgraphClient(this.clientStub);
  }

  async _init() {
    const res = await this.client.newTxn()
      .query(`{ updates(func:has(type${updateTypeName})) { schema }}`);

    const data = JSON.parse(new Buffer.from(res.getJson_asU8()).toString())
    const update = data.updates.pop();
    
    if (!update) {
      throw new Error('dgraph not initialised with schema');
    }
    
    const ast = transformSchema(
      parse(new Source(update.schema)),
      this.relay
    );
    
    this._info = getInfo(ast);
    this.schema = buildSchema(ast, this);

    this.app.use(mount(this._config.graphiqlUrl, koaGraphQl((ctx, next) => {
      const language = ctx.req.headers['accept-language'].split('-')[0];
      return {
        schema: this.schema,
        context: this.getContext(language),
        graphiql: this._config.graphiql
      }
    })));
  }

  listen(...args) {
    this.app.listen(...args);
  }

  async _set(schema) {
    const op = new Operation();
    op.setSchema(schema);
    await this.client.alter(op);
  }

  async _update(schema) {
    const version = 1;

    const res = await this.client.newTxn()
      .query(`{ updates(func:has(type${updateTypeName})) { schema }}`);

    const data = JSON.parse(new Buffer.from(res.getJson_asU8()).toString());

    if(data.updates.length > 1) {
      return;
    }
    
    schema = schema.replace(/\n/g, '\\n')
    schema = schema.replace(/"/g, '\\"')
    
    let sets = `_:node <type${updateTypeName}> "" .\n`;
    sets += `_:node <__typename> "${updateTypeName}" .\n`;
    sets += `_:node <schema> "${schema}" .\n`;
    sets += `_:node <version> "${version}" .\n`;
    
    const mutation = new Mutation();

    mutation.setCommitNow(true);
    mutation.setSetNquads(new Uint8Array(new Buffer.from(sets)));

    const txn = this.client.newTxn();

    await txn.mutate(mutation);
  }

  async updateSchema (schema) {
    const ast = transformSchema(parse(new Source(schema)), this.relay)
    const info = getInfo(ast)

    let gql = ''
    for (var [key, value] of info) {
      gql += key + ': ' + value.type
      if (value.indexes.size) {
        gql += ' @index(' + [...value.indexes].join(',') + ')'
      }
      gql += ' .\n'
    }

    await this._set(gql);
    await this._update(schema);
    await this._init();
  }

  getReversePredicate (predicate) {
    const info = this._info.get(predicate)
    return info ? info.reverse : null
  }
  localizePredicate (predicate, language) {
    const info = this._info.get(predicate)
    if (info && info.localize) {
      return `${predicate}@${language}`
    }
    return predicate
  }
  localizeValue (value, predicate, language) {
    const info = this._info.get(predicate)
    if (info && info.localize) {
      return `"${String(value)}"@${language}`
    }
    return `"${String(value)}"`
  }
  query (gql) {

    console.log("Query: ", gql);

    return this.client
      .newTxn()
      .query(gql)
      .then(res => {
        const data = JSON.parse(new Buffer.from(res.getJson_asU8()).toString());
        console.log(data);
        if (this._debug) {
          console.log(gql, '-->', JSON.stringify(data, null, '  '))
        }
        return data
      })
  }
  mutate (mutation) {
    mutation.setCommitNow(true)
    mutation.setIgnoreIndexConflict(true)
    if (this._debug) {
      const deletes = new Buffer.from(mutation.getDelNquads_asU8()).toString()
      if (deletes) console.log(`{ delete {\n${deletes} }}`)
      const sets = new Buffer.from(mutation.getSetNquads_asU8()).toString()
      if (sets) console.log(`{ set {\n${sets} }}`)
    }
    const txn = this.client.newTxn()
    return txn.mutate(mutation)
  }

  getContext (language = 'en') {
    return { server: this, language }
  }
}

export default Server;