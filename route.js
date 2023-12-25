const {
    register,
    login,
    masukparkir,
    keluarparkir,
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
];


module.exports = routes;