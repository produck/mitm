const MitmHandler = require('../');
const monitor = require('../strategy/monitor');

const mitm = MitmHandler(monitor, {});
mitm.listen(8080);