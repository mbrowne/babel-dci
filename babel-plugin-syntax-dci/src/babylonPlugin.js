//Plugin for Babel's parser (Babylon)

import { types as tt } from "babel-cli/node_modules/babel-core/node_modules/babylon/lib/tokenizer/types";
import Parser from "babel-cli/node_modules/babel-core/node_modules/babylon/lib/parser";

let pp = Parser.prototype;

// Roles

pp.dci_parseRole = function (node) {
	node.id = this.parseIdentifier();
	node.body = this.dci_parseRoleBody();
	
	return this.finishNode(node, "RoleDeclaration");
};

//adapted from parseClassBody(),
//https://github.com/babel/babel/blob/master/packages/babylon/src/parser/statement.js

pp.dci_parseRoleBody = function () {
	let roleBody = this.startNode();
	roleBody.body = [];

	this.expect(tt.braceL);

	while (!this.eat(tt.braceR)) {
		if (this.eat(tt.semi)) {
		  continue;
		}
		
    	let method = this.startNode();
    	
		let isGenerator = this.eat(tt.star);
		let isGetSet = false;
		let isAsync = false;
		
	    this.parsePropertyName(method);
	    
		let isAsyncMethod = this.hasPlugin("asyncFunctions") && !this.match(tt.parenL) && !method.computed && method.key.type === "Identifier" && method.key.name === "async";
		if (isAsyncMethod) {
		  if (this.hasPlugin("asyncGenerators") && this.eat(tt.star)) isGenerator = true;
		  isAsync = true;
		  this.parsePropertyName(method);
		}
		
		method.kind = "method";
		
		if (!method.computed) {
		  let { key } = method;

		  // handle get/set methods
		  // eg. class Foo { get bar() {} set bar() {} }
		  if (!isAsync && !isGenerator && key.type === "Identifier" && !this.match(tt.parenL) && (key.name === "get" || key.name === "set")) {
			isGetSet = true;
			method.kind = key.name;
			key = this.parsePropertyName(method);
		  }
		}

		this.dci_parseRoleMethod(roleBody, method, isGenerator, isAsync);

		// get methods aren't allowed to have any parameters
		// set methods must have exactly 1 parameter
		if (isGetSet) {
		  let paramCount = method.kind === "get" ? 0 : 1;
		  if (method.params.length !== paramCount) {
			let start = method.start;
			if (method.kind === "get") {
			  this.raise(start, "getter should have no params");
			} else {
			  this.raise(start, "setter should have exactly one param");
			}
		  }
		}
	}

	return this.finishNode(roleBody, "RoleDeclarationBody");
};

pp.dci_parseRoleMethod = function (roleBody, method, isGenerator, isAsync) {
  this.parseMethod(method, isGenerator, isAsync);
  roleBody.body.push(this.finishNode(method, "RoleMethod"));
};


// Contexts

pp.dci_parseContext = function (node) {
  node.id = this.parseIdentifier();
  
  //TODO
  
  return this.finishNode(node, "ContextDeclaration");
};

export default function (instance) {
	instance.extend("parseExpressionStatement", function (inner) {
		return function (node, expr) {
		  if (expr.type === "Identifier") {
			if (expr.name === "context") {
			  return this.dci_parseContext(node);
			}
			else if (expr.name === "role") {
			  return this.dci_parseRole(node);
			}
		  }

		  return inner.call(this, node, expr);
		};
	});
}