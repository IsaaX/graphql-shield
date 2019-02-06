import { graphql } from 'graphql'
import { applyMiddleware } from 'graphql-middleware'
import { makeExecutableSchema } from 'graphql-tools'
import { shield, rule } from '../src/index'

describe('Caching works as expected', () => {
  test('Strict cache - Rule is called multiple times, based on different parent.', async () => {
    /* Schema */

    const typeDefs = `
      type Query {
        test: [Test!]!
      }
  
      type Test {
        value: String!
      }
    `
    const resolvers = {
      Query: {
        test: () => [
          { value: 'pass-A' },
          { value: 'pass-A' },
          { value: 'pass-B' },
        ],
      },
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })

    /* Permissions */

    const allowMock = jest.fn().mockResolvedValue(true)
    const permissions = shield({
      Test: rule({ cache: 'strict' })(allowMock),
    })

    const schemaWithPermissions = applyMiddleware(schema, permissions)

    /* Execution */

    const query = `
      query {
        test {
          value
        }
      }
    `
    const res = await graphql(schemaWithPermissions, query, undefined, {})

    expect(res).toEqual({
      data: {
        test: [{ value: 'pass-A' }, { value: 'pass-A' }, { value: 'pass-B' }],
      },
    })
    expect(allowMock).toBeCalledTimes(2)
  })

  test('Strict cache - Rule is called multiple times, based on different arguments.', async () => {
    /* Schema */

    const typeDefs = `
      type Query {
        a: String!
        b: String!
        c(arg: String): String!
        d(arg: String): String!
        e(arg: String): String!
      }
    `
    const resolvers = {
      Query: {
        a: () => 'a',
        b: () => 'b',
        c: () => 'c',
        d: () => 'd',
        e: () => 'e',
      },
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })

    /* Tests */

    const allowMock = jest.fn().mockResolvedValue(true)

    const permissions = shield({
      Query: rule({ cache: 'strict' })(allowMock),
    })

    const schemaWithPermissions = applyMiddleware(schema, permissions)

    /* Execution */

    const query = `
      query {
        a
        b
        c(arg: "foo")
        d(arg: "bar")
        e
      }
    `
    const res = await graphql(schemaWithPermissions, query, undefined, {})

    /* Tests */

    expect(res).toEqual({
      data: {
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
        e: 'e',
      },
    })
    expect(allowMock).toBeCalledTimes(3)
  })

  test('Contextual Cache - rules get executed only once if reused.', async () => {
    /* Schema */

    const typeDefs = `
      type Query {
        a: String!
        b: String!
        c(arg: String): String!
        d(arg: String): String!
        e(arg: String): String!
      }
    `
    const resolvers = {
      Query: {
        a: () => 'a',
        b: () => 'b',
        c: () => 'c',
        d: () => 'd',
        e: () => 'e',
      },
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })

    /* Permissions */

    const ruleOneMock = jest.fn().mockResolvedValue(true)
    const ruleOne = rule({ cache: 'contextual' })(ruleOneMock)

    const ruleTwoMock = jest.fn().mockResolvedValue(true)
    const ruleTwo = rule({ cache: 'contextual' })(ruleTwoMock)

    const permissions = shield({
      Query: {
        a: ruleOne,
        b: ruleOne,
        c: ruleOne,
        d: ruleTwo,
        e: ruleTwo,
      },
    })

    const schemaWithPermissions = applyMiddleware(schema, permissions)

    // Execution
    const query = `
      query {
        a
        b
        c(arg: "foo")
        d(arg: "bar")
        e
      }
    `
    const res = await graphql(schemaWithPermissions, query, undefined, {})

    /* Tests */

    expect(res).toEqual({
      data: {
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
        e: 'e',
      },
    })
    expect(ruleOneMock).toBeCalledTimes(1)
    expect(ruleTwoMock).toBeCalledTimes(1)
  })

  test('No Cache - rule is reexecuted every time.', async () => {
    /* Schema */

    const typeDefs = `
      type Query {
        a: String!
        b: String!
        c(arg: String): String!
        d(arg: String): String!
        e(arg: String): String!
      }
    `
    const resolvers = {
      Query: {
        a: () => 'a',
        b: () => 'b',
        c: () => 'c',
        d: () => 'd',
        e: () => 'e',
      },
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })

    /* Permissions */

    const allowMock = jest.fn().mockResolvedValue(true)
    const allow = rule({ cache: 'no_cache' })(allowMock)

    const permissions = shield({
      Query: allow,
    })

    const schemaWithPermissions = applyMiddleware(schema, permissions)

    /* Execution */

    const query = `
      query {
        a
        b
        c(arg: "foo")
        d(arg: "bar")
        e
      }
    `
    const res = await graphql(schemaWithPermissions, query, undefined, {})

    /* Tests */

    expect(res).toEqual({
      data: {
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
        e: 'e',
      },
    })
    expect(allowMock).toBeCalledTimes(5)
  })
})

describe('Legacy cache', () => {
  test('Strict cache - Rule is called multiple times, based on different parent.', async () => {
    /* Schema */

    const typeDefs = `
      type Query {
        test: [Test!]!
      }
  
      type Test {
        value: String!
      }
    `
    const resolvers = {
      Query: {
        test: () => [
          { value: 'pass-A' },
          { value: 'pass-A' },
          { value: 'pass-B' },
        ],
      },
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })

    /* Permissions */

    const allowMock = jest.fn().mockResolvedValue(true)
    const permissions = shield({
      Test: rule({ cache: true })(allowMock),
    })

    const schemaWithPermissions = applyMiddleware(schema, permissions)

    /* Execution */

    const query = `
      query {
        test {
          value
        }
      }
    `
    const res = await graphql(schemaWithPermissions, query, undefined, {})

    /* Tests */

    expect(res).toEqual({
      data: {
        test: [{ value: 'pass-A' }, { value: 'pass-A' }, { value: 'pass-B' }],
      },
    })
    expect(allowMock).toBeCalledTimes(2)
  })

  test('No Cache - rule is reexecuted every time.', async () => {
    /* Schema */

    const typeDefs = `
      type Query {
        a: String!
        b: String!
        c(arg: String): String!
        d(arg: String): String!
        e(arg: String): String!
      }
    `
    const resolvers = {
      Query: {
        a: () => 'a',
        b: () => 'b',
        c: () => 'c',
        d: () => 'd',
        e: () => 'e',
      },
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })

    /* Permissions */
    const allowMock = jest.fn().mockResolvedValue(true)
    const allow = rule({ cache: false })(allowMock)

    const permissions = shield({
      Query: allow,
    })

    const schemaWithPermissions = applyMiddleware(schema, permissions)

    // Execution
    const query = `
      query {
        a
        b
        c(arg: "foo")
        d(arg: "bar")
        e
      }
    `
    const res = await graphql(schemaWithPermissions, query, undefined, {})

    expect(res).toEqual({
      data: {
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
        e: 'e',
      },
    })
    expect(allowMock).toBeCalledTimes(5)
  })
})
