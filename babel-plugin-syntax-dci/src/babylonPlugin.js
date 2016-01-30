//Plugin for Babel's parser (Babylon)

//TEMP
const log = console.log;

import { types as tt } from "babylon/lib/tokenizer/types";
import Parser from "babylon/lib/parser";

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
	
	instance.extend("parseExport", function (inner) {
		return function(node) {
			//Copied and pasted from babylon/src/parser/statement.js
			//with small modifications to allow DCI contexts declared with the `context` keyword
			//to be exported (modifications indicated with 'DCI' comments).
		
			this.next();
			// export * from '...'
			if (this.match(tt.star)) {
			  let specifier = this.startNode();
			  this.next();
			  if (this.hasPlugin("exportExtensions") && this.eatContextual("as")) {
				specifier.exported = this.parseIdentifier();
				node.specifiers = [this.finishNode(specifier, "ExportNamespaceSpecifier")];
				this.parseExportSpecifiersMaybe(node);
				this.parseExportFrom(node, true);
			  } else {
				this.parseExportFrom(node, true);
				return this.finishNode(node, "ExportAllDeclaration");
			  }
			} else if (this.hasPlugin("exportExtensions") && this.isExportDefaultSpecifier()) {
			  let specifier = this.startNode();
			  specifier.exported = this.parseIdentifier(true);
			  node.specifiers = [this.finishNode(specifier, "ExportDefaultSpecifier")];
			  if (this.match(tt.comma) && this.lookahead().type === tt.star) {
				this.expect(tt.comma);
				let specifier = this.startNode();
				this.expect(tt.star);
				this.expectContextual("as");
				specifier.exported = this.parseIdentifier();
				node.specifiers.push(this.finishNode(specifier, "ExportNamespaceSpecifier"));
			  } else {
				this.parseExportSpecifiersMaybe(node);
			  }
			  this.parseExportFrom(node, true);
			} else if (this.eat(tt._default)) { // export default ...
			  let expr = this.startNode();
			  let needsSemi = false;
			  if (this.eat(tt._function)) {
				expr = this.parseFunction(expr, true, false, false, true);
			  } else if (this.match(tt._class)) {
				expr = this.parseClass(expr, true, true);
			  
			  //DCI
			  //ADDED FOR DCI
			  } else if (this.state.value === 'context') {
				this.next();
				expr = this.dci_parseContext(expr);
				
			  } else {
				needsSemi = true;
				expr = this.parseMaybeAssign();
			  }
			  node.declaration = expr;
			  if (needsSemi) this.semicolon();
			  this.checkExport(node);
			  return this.finishNode(node, "ExportDefaultDeclaration");
			  
			//DCI modified
			} else if (this.state.type.keyword || this.state.value === 'context' || this.shouldParseExportDeclaration()) {
			//} else if (this.state.type.keyword || this.shouldParseExportDeclaration()) {
			
			  node.specifiers = [];
			  node.source = null;
			  node.declaration = this.parseExportDeclaration(node);
			} else { // export { x, y as z } [from '...']
			  node.declaration = null;
			  node.specifiers = this.parseExportSpecifiers();
			  this.parseExportFrom(node);
			}
			this.checkExport(node);
			return this.finishNode(node, "ExportNamedDeclaration");
		};
	});
	
	//COPIED FROM babylon/src/plugins/flow.js
	//We need this to parse role-player contracts since the flow parser plugin hasn't
	//been fully initialized yet when the DCI Babylon plugin runs
	//(the flow plugin is always added last.)
	//
	// don't consider `void` to be a keyword as then it'll use the void token type
	// and set startExpr
	instance.extend("isKeyword", function (inner) {
	  return function (name) {
		if (this.state.inType && name === "void") {
		  return false;
		} else {
		  return inner.call(this, name);
		}
	  };
	});
}

let pp = Parser.prototype;

// Roles

pp.dci_parseRole = function (node) {
	node.id = this.parseIdentifier();
	this.dci_parseRoleBody(node);
	return this.finishNode(node, "RoleDeclaration");
};

//Parse role body
//Adapted from parseClassBody(),
//https://github.com/babel/babel/blob/master/packages/babylon/src/parser/statement.js
pp.dci_parseRoleBody = function (node) {
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
	
	//Role-Player contracts
	if (this.match(tt.name) && this.state.value === 'contract') {
		let id = this.parseIdentifier();
		if (id.name === 'contract') {
			//use flow syntax plugin to parse the contract
			let contract = this.flowParseObjectType();
			contract.type = 'RolePlayerContract';
			node.contract = contract;
			
			//let contract = this.startNode();
			//this.expect(tt.braceL);
			//while (!this.eat(tt.braceR)) {
			//	
			//}
			//this.finishNode(contract, "RolePlayerContract");
		}
	}

	node.body = this.finishNode(roleBody, "RoleDeclarationBody");
};

pp.dci_parseRoleMethod = function (roleBody, method, isGenerator, isAsync) {
  this.parseMethod(method, isGenerator, isAsync);
  roleBody.body.push(this.finishNode(method, "RoleMethod"));
};


// Context declarations (context MyContext {...})

pp.dci_parseContext = function (node) {
  node.id = this.parseIdentifier();
  this.dci_parseContextBody(node);
  return this.finishNode(node, "ContextDeclaration");
};

//Parse context body
//Adapted from parseClassBody(),
//https://github.com/babel/babel/blob/master/packages/babylon/src/parser/statement.js
pp.dci_parseContextBody = function (node) {
	// context bodies are implicitly strict
	let oldStrict = this.state.strict;
	this.state.strict = true;
	
	let hadConstructorCall = false;
	let hadConstructor = false;
	let decorators = [];
	let ctxBody = this.startNode();
	ctxBody.body = [];

	this.expect(tt.braceL);

	while (!this.eat(tt.braceR)) {
		if (this.eat(tt.semi)) {
		  continue;
		}
		
		//TODO?
		//annotations
		/*
		if (this.match(tt.at)) {
		}
		*/
		
    	let member = this.startNode();
		this.parsePropertyName(member);
		
		if (member.key.type === 'Identifier' && member.key.name === 'role') {
			ctxBody.body.push(this.dci_parseRole(member));
			continue;
		}
		
		let method = member;
    	
		//let isConstructorCall = false;
		let isGenerator = this.eat(tt.star);
		let isGetSet = false;
		let isAsync = false;
		
		if (!isGenerator && method.key.type === "Identifier" && !method.computed) {
		  if (this.dci_isContextProperty()) {
			ctxBody.body.push(this.dci_parseContextProperty(method));
			continue;
		  }
		  
		  /*
		  if (this.hasPlugin("classConstructorCall") && method.key.name === "call" && this.match(tt.name) && this.state.value === "constructor") {
			isConstructorCall = true;
			this.parsePropertyName(method);
		  }
		  */
		}
	    
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
		  
			// disallow invalid constructors
			let isConstructor = (key.type === "Identifier" && key.name === "constructor")
				|| (key.type === "StringLiteral" && key.value === "constructor");
			/*
			let isConstructor = !isConstructorCall && (
			  (key.type === "Identifier" && key.name === "constructor") ||
			  (key.type === "StringLiteral" && key.value === "constructor")
			);
			*/
			if (isConstructor) {
			  if (hadConstructor) this.raise(key.start, "Duplicate constructor in the same DCI context");
			  if (isGetSet) this.raise(key.start, "Constructor can't have get/set modifier");
			  if (isGenerator) this.raise(key.start, "Constructor can't be a generator");
			  if (isAsync) this.raise(key.start, "Constructor can't be an async function");
			  method.kind = "constructor";
			  hadConstructor = true;
			}
		}
		
		/*
		// convert constructor to a constructor call
		if (isConstructorCall) {
		  if (hadConstructorCall) this.raise(method.start, "Duplicate constructor call in the same DCI context");
		  method.kind = "constructorCall";
		  hadConstructorCall = true;
		}
		*/
		
		// disallow decorators on class constructors
		if ((method.kind === "constructor" || method.kind === "constructorCall") && method.decorators) {
		  this.raise(method.start, "You can't attach decorators to a DCI context constructor");
		}

		this.dci_parseContextMethod(ctxBody, method, isGenerator, isAsync);

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
	
	if (decorators.length) {
	  this.raise(this.state.start, "You have trailing decorators with no method");
	}

	node.body = this.finishNode(ctxBody, "ContextBody");
	
	this.state.strict = oldStrict;
};

pp.dci_parseContextMethod = function (ctxBody, method, isGenerator, isAsync) {
  this.parseMethod(method, isGenerator, isAsync);
  ctxBody.body.push(this.finishNode(method, "ContextMethod"));
};

pp.dci_isContextProperty = function () {
  return this.match(tt.eq) || this.isLineTerminator();
};

pp.dci_parseContextProperty = function (node) {
  if (this.match(tt.eq)) {
    this.next();
    node.value = this.parseMaybeAssign();
  } else {
    node.value = null;
  }
  this.semicolon();
  return this.finishNode(node, "ContextProperty");
};