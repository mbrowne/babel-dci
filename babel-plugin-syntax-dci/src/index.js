import {default as dciBabylonPlugin} from "./babylonPlugin";

//NOTE:
//In order for this to work, this import statement must resolve to the same copy of
//babylon that is used by the currently loaded Babel instance.
//Make sure that there is no babylon folder in node_modules/babel_core/node_modules
//(or any other copies of babylon other than the one at node_modules/babylon).
import { plugins } from "babylon/lib/parser";

plugins.dci = dciBabylonPlugin;

export default function () {
  return {
    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("dci");
    }
  };
}

//TEMP solution for babel-standalone
module.exports = exports.default;