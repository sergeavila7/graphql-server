const User = require('../models/User');
const Product = require('../models/Product');
const Client = require('../models/Client');
const Order = require('../models/Order');

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'enviroments.env' });

const createToken = (user, SECRET, expiresIn) => {
  console.log(user);

  const { id, email, name, lastname } = user;

  return jwt.sign({ id, email, name, lastname }, SECRET, { expiresIn });
};

// Resolvers
const resolvers = {
  Query: {
    getUser: async (_, {}, ctx) => {
      return ctx.user;
    },
    getProducts: async () => {
      try {
        const products = await Product.find({});
        return products;
      } catch (error) {
        console.log(error);
      }
    },
    getProduct: async (_, { id }) => {
      // Revisar si el producto existe
      const product = await Product.findById(id);

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      return product;
    },
    getClients: async () => {
      try {
        const clients = await Client.find({});
        return clients;
      } catch (error) {
        console.log(error);
      }
    },

    getClientSeller: async (_, {}, ctx) => {
      try {
        const clients = await Client.find({ seller: ctx.user.id.toString() });
        return clients;
      } catch (error) {
        console.log(error);
      }
    },

    getClient: async (_, { id }, ctx) => {
      // Revisar si el cliente existe

      const client = await Client.findById(id);

      if (!client) {
        throw new Error('Cliente no encontrado');
      }

      // Quien lo creo puede consultarlo
      if (client.seller.toString() !== ctx.user.id) {
        throw new Error('No tienes las credenciales');
      }
      return client;
    },

    getOrders: async (_, {}) => {
      try {
        const orders = await Order.find({});
        return orders;
      } catch (error) {
        console.log(error);
      }
    },

    getOrdersSeller: async (_, {}, ctx) => {
      try {
        const orders = await Order.find({ seller: ctx.user.id }).populate(
          'client'
        );
        console.log(orders);
        return orders;
      } catch (error) {
        console.log(error);
      }
    },
    getOrder: async (_, { id }, ctx) => {
      // Verificar si el pedido existe
      const order = await Order.findById(id);
      if (!order) {
        throw new Error('Pedido no encontrado');
      }

      if (order.seller.toString() !== ctx.user.id) {
        throw new Error('No tienes las credenciales');
      }

      return order;
    },

    getOrdersState: async (_, { state }, ctx) => {
      const orders = await Order.find({ seller: ctx.user.id, state });

      // retornar el resultado
      return orders;
    },

    bestClients: async () => {
      const clients = await Order.aggregate([
        { $match: { state: 'COMPLETADO' } },
        {
          $group: {
            _id: '$client',
            total: { $sum: '$total' },
          },
        },
        {
          $lookup: {
            from: 'clients',
            localField: '_id',
            foreignField: '_id',
            as: 'client',
          },
        },
        {
          $sort: { total: -1 },
        },
      ]);

      return clients;
    },

    bestSellers: async () => {
      const sellers = await Order.aggregate([
        { $match: { state: 'COMPLETADO' } },
        {
          $group: {
            _id: '$seller',
            total: { $sum: '$total' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'seller',
          },
        },
        {
          $limit: 3,
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return sellers;
    },

    searchProduct: async (_, { text }) => {
      const products = await Product.find({ $text: { $search: text } }).limit(
        10
      );

      return products;
    },
  },

  Mutation: {
    newUser: async (_, { input }) => {
      const { email, password } = input;

      // Revisar si el usuario ya esta registrado
      const existUser = await User.findOne({ email });
      if (existUser) {
        throw new Error('El usuario ya esta registrado');
      }
      // Hashear su password
      const salt = await bcryptjs.genSaltSync(10);
      input.password = await bcryptjs.hashSync(password, salt);
      try {
        // Guardar en la DB
        const user = new User(input);
        user.save();
        return user;
      } catch (error) {
        console.log(error);
      }
    },

    authUser: async (_, { input }) => {
      const { email, password } = input;

      // Si el usuario existe
      const existUser = await User.findOne({ email });
      if (!existUser) {
        throw new Error('El usuario no existe');
      }

      // Revisar si el password es correcto
      const correctPassword = await bcryptjs.compare(
        password,
        existUser.password
      );

      if (!correctPassword) {
        throw new Error('El password es incorrecto');
      }

      // Crear el token
      return {
        token: createToken(existUser, process.env.SECRET, '24h'),
      };
    },

    newProduct: async (_, { input }) => {
      try {
        const product = new Product(input);

        // almacenar en la DB
        const res = await product.save();

        return res;
      } catch (error) {
        console.log(error);
      }
    },
    updateProduct: async (_, { id, input }) => {
      // Revisar si el producto existe
      let product = await Product.findById(id);

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      // Guardarlo en la BD
      product = await Product.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return product;
    },

    deleteProduct: async (_, { id }) => {
      // Revisar si el producto existe
      let product = await Product.findById(id);

      if (!product) {
        throw new Error('Producto no encontrado');
      }
      // Eliminar
      await Product.findByIdAndDelete({ _id: id });

      return 'Producto eliminado';
    },
    newClient: async (_, { input }, ctx) => {
      console.log(ctx);
      const { email } = input;
      // Verificar si el cliente ya esta registrado

      const client = await Client.findOne({ email });
      if (client) {
        throw new Error('Ese cliente ya esta registrado');
      }

      const newClient = new Client(input);
      // Asignar vendedor
      newClient.seller = ctx.user.id;
      // Guardarlo en la BD
      try {
        const res = await newClient.save();
        return res;
      } catch (error) {
        console.log(error);
      }
    },

    updateClient: async (_, { id, input }, ctx) => {
      // Verificar si existe o no
      let client = await Client.findById(id);

      if (!client) {
        throw new Error('Ese cliente no existe');
      }
      // Verificar si el vendedor es quien edita
      if (client.seller.toString() !== ctx.user.id) {
        throw new Error('No tienes las credenciales');
      }
      // Guardar el cliente
      client = await Client.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return client;
    },

    deleteClient: async (_, { id }, ctx) => {
      // Verificar si existe o no
      let client = await Client.findById(id);

      if (!client) {
        throw new Error('Ese cliente no existe');
      }

      // Verificar si el vendedor es quien elimina
      if (client.seller.toString() !== ctx.user.id) {
        throw new Error('No tienes las credenciales');
      }

      // Eliminar cliente
      await Client.findOneAndDelete({ _id: id });
      return 'Cliente Eliminado';
    },

    newOrder: async (_, { input }, ctx) => {
      const { client } = input;

      // Verificar si el cliente existe
      let clientExist = await Client.findById(client);

      if (!clientExist) {
        throw new Error('Ese cliente no existe');
      }
      // Verificar si el cliente es del vendedor
      if (clientExist.seller.toString() !== ctx.user.id) {
        throw new Error('No tienes las credenciales');
      }
      // Revisar que el stock sea suficiente
      if (input.order) {
        for await (const article of input.order) {
          const { id } = article;

          const product = await Product.findById(id);

          if (article.amount > product.stock) {
            throw new Error(
              `El articulo:${product.name} excede la cantidad disponible `
            );
          } else {
            product.stock = product.stock - article.amount;

            await product.save();
          }
        }
      }

      // Crear un nuevo pedido
      const newOrder = new Order(input);
      // Asignar un venderdor
      newOrder.seller = ctx.user.id;
      // Guardar en BDc
      const res = await newOrder.save();
      return res;
    },

    updateOrder: async (_, { id, input }, ctx) => {
      const { client } = input;
      // Si el pedido existe
      const existOrder = await Order.findById(id);
      if (!existOrder) {
        throw new Error('El pedido no existe');
      }
      // Si el cliente existe
      const existClient = await Client.findById(client);
      if (!existClient) {
        throw new Error('El Cliente no existe');
      }
      // Si el cliente y pedido pertenece al vendedor
      if (existClient.seller.toString() !== ctx.user.id) {
        throw new Error('No tienes las credenciales');
      }

      // Revisar el stock
      // for await (const article of input.order) {
      //   const { id } = article;

      //   const product = await Product.findById(id);

      //   if (article.amount > product.stock) {
      //     throw new Error(
      //       `El articulo:${product.name} excede la cantidad disponible `
      //     );
      //   } else {
      //     product.stock = product.stock - article.amount;

      //     await product.save();
      //   }
      // }

      // Guardar el pedido
      const res = await Order.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return res;
    },

    deleteOrder: async (_, { id }, ctx) => {
      // Verificar si el pedido existe
      const order = await Order.findById(id);
      if (!order) {
        throw new Error('El pedido no existe ');
      }
      // Verificar si el vendedor coincide con la creacion
      if (order.seller.toString() !== ctx.user.id) {
        throw new Error('No tienes las credenciales');
      }

      // Eliminar de la BD
      await Order.findOneAndDelete({ _id: id });

      return 'Pedido eliminado';
    },
  },
};

module.exports = resolvers;
