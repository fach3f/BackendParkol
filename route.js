const {
    register,
    login,
    masukparkir,
    keluarparkir,
    getParkirData,
    getTotalKendaraanLantai1,
    getTotalKendaraanLantai2,
  } = require("./handler");

  const routes = [
    {
      method: "POST",
      path: "/register",
      handler: register,
    },
    {
      method: "POST",
      path: "/login",
      handler: login,
    },
    {
        method: "POST",
        path: "/masukparkir",
        handler: masukparkir,
    },
    {
        method: "POST",
        path: "/keluarparkir",
        handler: keluarparkir,
    },
    {
      method: 'GET',
      path: '/parkir',
      handler: getParkirData,
    },
    {
      method: 'GET',
      path: '/total-kendaraan-lantai-1',
      handler: getTotalKendaraanLantai1,
    },

  // Route to get the total number of vehicles on lantai 2
    {
      method: 'GET',
      path: '/total-kendaraan-lantai-2',
      handler: getTotalKendaraanLantai2,
    },
];


module.exports = routes;