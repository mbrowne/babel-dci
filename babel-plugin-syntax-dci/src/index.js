import {default as dciBabylonPlugin} from "./babylonPlugin";
import { plugins } from "babel-cli/node_modules/babel-core/node_modules/babylon/lib/parser";
plugins.dci = dciBabylonPlugin;

export default function () {
  return {
    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("dci");
    }
  };
}