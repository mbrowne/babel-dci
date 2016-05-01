//TEMP
const log = console.log;

import {parse} from "babylon";
import * as helpers from "babel-helpers/lib/helpers";

//Code to initialize __context variable.
//This works on the server and in the browser and in both strict and non-strict mode.
//If it's a constructor function, __context is set to `this`; otherwise, create an empty object to
//be used as a container to hold the role methods.
//
//TODO
//Could we just do this instead?
//var __context = (this instanceof MyContext ? this: {});
//
//TODO
//It would be more efficient to build the AST for this programmatically
let code = "(this===undefined || (typeof global !== 'undefined' && this === global) || (typeof window !== 'undefined' && this === window) ? {}: this)";
const initContextVariableAst = parse(code).program.body[0].expression;

code = "throw Error(\"Contexts defined with the 'context' declaration should be instantiated with the 'new' operator.\");";
const contextCallCheckErrorAst = parse(code).program.body[0];

//how to properly add a helper? this doesn't work
//code = "var dci = {};";
//helpers.dci_getRoleMember = parse(code).program.body[0];

export default function({types: t}) {
	//this makes it possible to create a ContextDeclaration visitor
	t.TYPES.push('ContextDeclaration');
	
	//Allow DCI node types to be traversed.
	//This is a bit of a hack; ideally we would define our types using defineType()
	//as in https://github.com/babel/babel/blob/master/packages/babel-types/src/definitions/es2015.js.
	//But this plugin runs too late for that to work.
	//
	//Note: BUILDER_KEYS and NODE_FIELDS may also be needed for future requirements.
	//See https://github.com/babel/babel/blob/master/packages/babel-types/src/definitions/index.js
	
	t.VISITOR_KEYS.RoleDeclaration = ['id', 'body'];
	t.VISITOR_KEYS.RoleDeclarationBody = ['body'];
	t.VISITOR_KEYS.RoleMethod = ['key', 'params', 'body', 'decorators', 'returnType', 'typeParameters'];
	t.VISITOR_KEYS.ContextDeclaration = ['id', 'body', 'decorators'];
	t.VISITOR_KEYS.ContextBody = ['body'];
	t.VISITOR_KEYS.ContextProperty = ['key', 'value', 'decorators'];
	t.VISITOR_KEYS.ContextMethod = ['key', 'params', 'body', 'decorators', 'returnType', 'typeParameters'];
	
	t.ALIAS_KEYS.ContextDeclaration = ["Scopable", "Statement", "Declaration"];
	t.ALIAS_KEYS.ContextMethod = ["Function", "Scopable", "BlockParent", "FunctionParent", "Method", "ObjectMethod"];
	//Aliases appear not to be needed for ContextProperty (since it doesn't look like there are any for ClassProperty)
	
	//We need to update FLIPPED_ALIAS_KEYS as well (it's used internally by babel-types)
	for (let type of ['ContextDeclaration', 'ContextMethod']) {
		let aliases = t.ALIAS_KEYS[type];
		for (let alias of aliases) {
		  let types = t.FLIPPED_ALIAS_KEYS[alias] = t.FLIPPED_ALIAS_KEYS[alias] || [];
		  types.push(type);
		}
	}
	
	return {
		inherits: require("babel-plugin-syntax-dci"),
	
		visitor: {
			FunctionDeclaration(path, state) {
				//state.file.addHelper('dci_getRoleMember');
				
				let fnDecl = path.node;
				
				//2-dimensional map of role methods indexed by role name and then by method name
				let roleMethods = {};
				let rolePaths = [];

				//role-player type annotations, indexed by role name
				//not currently used but might be needed for future features
				let playerTypeAnnotations = {};
				let nodesToKeep = [];
				
				for (let subPath of path.get('body.body')) {
					if (subPath.equals('type', 'RoleDeclaration')) {
						rolePaths.push(subPath);
						let roleName = subPath.node.id.name;
						roleMethods[roleName] = indexRoleMethodsByName(subPath.node);
					}
					else nodesToKeep.push(subPath.node);
				}

				fnDecl.isDCIContext = (rolePaths.length > 0);
		
				if (!fnDecl.isDCIContext) {
					return;
				}

				let automaticBindings = automaticallyBindConstructorParams(fnDecl.params, roleMethods, playerTypeAnnotations);
				fnDecl.body.body = automaticBindings.concat(nodesToKeep);
				
				//TODO
				//Type-casts for accessing instance properties

				let roleDescriptors = transformRolesToDescriptors(roleMethods, rolePaths);
				
				//Also initialize the roleBindings map					
				let roleBindingsMapInit = initRoleBindingsMap(rolePaths);
				
				roleDescriptors.push(t.ObjectProperty(
					t.Identifier('__roleBindings'),
					t.ObjectExpression([
						t.ObjectProperty(t.Identifier('value'), t.Identifier('__roleBindings'))
					])
				));
				
				//Old version
				/*
				roleDescriptors.push(t.ObjectProperty(
					t.Identifier('__roleBindings'),
					t.ObjectExpression([
						t.ObjectProperty(t.Identifier('value'), t.ObjectExpression([]))
					])
				));
				*/
				
				transformContextMethods(path.get('body'), roleMethods, playerTypeAnnotations);
				
				let roleAssignments = [
					t.CallExpression(
						t.MemberExpression(t.Identifier('Object'), t.Identifier('defineProperties')),
						[
							t.Identifier('__context'),
							t.ObjectExpression(roleDescriptors)
						]
					)
				];
				
				//declare any role variables that haven't yet been declared
				let roleVarDeclarators = initRolePlayerVars(path, roleMethods);
				if (roleVarDeclarators.length) {
					roleAssignments.unshift(t.VariableDeclaration('var', roleVarDeclarators));
				}
				
				//Initialize __context variable
				//If it's a constructor function, __context is set to `this`; otherwise, create an empty object to
				//be used as a container to hold the role methods.
				//
				//Would it be possible to detect whether we're generating a commonjs or AMD mode here rather than checking for
				//both global and window at runtime? But what about UMD modules intended to run in either environment?
				//
				//var __context = (this===undefined || (typeof global !== 'undefined' && this === global) || (typeof window !== 'undefined' && this === window) ? {}: this);	
				let ctxAssignment = t.VariableDeclaration('var', [
					t.VariableDeclarator(
						t.Identifier('__context'),
						initContextVariableAst
					)
				]);
				
				//TODO
				//Inner contexts - generate unique context variable for each level?
				//e.g. var __context2 = ...
				
				//transform role-player contracts to flow type aliases
				let contractsAsFlowTypes = transformRolePlayerContracts(rolePaths);
				
				//add initialization code to top of function declaration
				fnDecl.body.body = [ctxAssignment].concat(contractsAsFlowTypes, [roleBindingsMapInit], roleAssignments, fnDecl.body.body);
			},
			
			ContextDeclaration(path) {
				let node = path.node;
				
				//2-dimensional map of role methods indexed by role name and then by method name
				let roleMethods = {};
				let rolePaths = [];
				
				//role-player type annotations, indexed by role name
				//not currently used but might be needed for future features
				let playerTypeAnnotations = {};
				let contextMemberPaths = [];
				
				for (let subPath of path.get('body.body')) {
					if (subPath.equals('type', 'RoleDeclaration')) {
						rolePaths.push(subPath);
						let roleName = subPath.node.id.name;
						roleMethods[roleName] = indexRoleMethodsByName(subPath.node);
					}
					else {
						let node = subPath.node;
						if (!node.kind || node.kind != 'constructor') {
							contextMemberPaths.push(subPath);
						}
					}
				}					
				
				//Transform Context members
				
				let contextMemberDescriptors = [];
				let valueId = t.Identifier('value');
				
				//Transform Context members to descriptors that will be passed to
				//Object.defineProperties(this, ...);
				for (let subPath of contextMemberPaths) {
					let member = subPath.node;
					if (member.type === 'ContextMethod') {
						contextMemberDescriptors.push( transformContextMethodToDescriptor(subPath) );
					}
					else if (member.type === 'ContextProperty') {
						let prop = member;
						if (prop.decorators) continue;
						if (!prop.value) continue;
						contextMemberDescriptors.push(t.ObjectProperty(
							prop.key,
							t.ObjectExpression([
								t.ObjectProperty(valueId, prop.value)
							])
						));
					}
				}
				
				let constructorPath,
					constructorParams = [];
				for (let subPath of path.get('body.body')) {
					if (subPath.node.kind === 'constructor') {
						constructorPath = subPath;
						constructorParams = subPath.node.params;
						break;
					}
				}
				
				//Transform constructor body
				let constructorBodyNodes = [];
				if (constructorPath) {
					constructorBodyNodes = constructorPath.node.body.body;
					transformContextMethods(constructorPath.get('body'), roleMethods, playerTypeAnnotations);
				}
				
				let automaticBindings = automaticallyBindConstructorParams(constructorParams, roleMethods, playerTypeAnnotations);
				constructorBodyNodes = automaticBindings.concat(constructorBodyNodes);
				
				//Transform roles
				
				let roleDescriptors = transformRolesToDescriptors(roleMethods, rolePaths);
				
				//Also initialize the roleBindings map					
				let roleBindingsMapInit = initRoleBindingsMap(rolePaths);
				
				roleDescriptors.push(t.ObjectProperty(
					t.Identifier('__roleBindings'),
					t.ObjectExpression([
						t.ObjectProperty(t.Identifier('value'), t.Identifier('__roleBindings'))
					])
				));				
				
				//Add initialization code at the top of the Context function
				
				//if (!(this instanceof [[ContextName]]))
				//	throw Error("Contexts defined with the 'context' declaration should be instantiated with the 'new' operator.");
				let ctxCallCheck = t.IfStatement(
					t.UnaryExpression('!', t.BinaryExpression('instanceof', t.ThisExpression(), node.id), true),
					contextCallCheckErrorAst
				);	
				
				//var __context = this;
				let ctxAssignment = t.VariableDeclaration('var', [
					t.VariableDeclarator(
						t.Identifier('__context'),
						t.ThisExpression()
					)
				]);
				
				//transform role-player contracts to flow type aliases
				let contractsAsFlowTypes = transformRolePlayerContracts(rolePaths);
				
				//declare any role variables that haven't yet been declared
				let roleVarDeclarators = initRolePlayerVars(path, roleMethods);
				if (roleVarDeclarators.length) {
					roleBindingsMapInit.declarations = roleBindingsMapInit.declarations.concat(roleVarDeclarators);
				}
				
				//Put it all together
				let fnBodyNodes = [
					ctxCallCheck,
					ctxAssignment
				];
				fnBodyNodes = fnBodyNodes.concat(contractsAsFlowTypes, [
					roleBindingsMapInit,
					t.ExpressionStatement(
						t.CallExpression(
							//Object.defineProperties(this, {...});
							t.MemberExpression(t.Identifier('Object'), t.Identifier('defineProperties')),
							[
								t.ThisExpression(),
								t.ObjectExpression(roleDescriptors.concat(contextMemberDescriptors))
							]
						)
					)
				]);
				
				fnBodyNodes = fnBodyNodes.concat(constructorBodyNodes);
				
				//was the Context declaration preceded with 'export default'?
				if (path.parentPath.isExportDefaultDeclaration()) {
					path = path.parentPath;
					path.insertAfter(t.exportDefaultDeclaration(node.id));
				}
				
				path.replaceWith(
					t.FunctionDeclaration(node.id, constructorParams, t.BlockStatement(fnBodyNodes))
				);
				
				
				function transformContextMethodToDescriptor(subPath) {
					let method = subPath.node;
					//determine whether to set 'value', 'get', or 'set' property of the descriptor.
					let methodKindId = (method.kind === 'method' ? valueId: t.Identifier(method.kind))
					
					transformContextMethods(subPath.get('body'), roleMethods);
					let fnDecl = t.FunctionExpression(method.key, method.params, method.body, method.generator, method.async);
					return t.ObjectProperty(
						method.key,
						t.ObjectExpression([
							t.ObjectProperty(methodKindId, fnDecl)
						])
					);
				}
			} //end ContextDeclaration visitor
		}
	};
	
	function indexRoleMethodsByName(roleDecl) {
		let body = roleDecl.body.body;
		let roleMethods = {};
		for (let method of body) {
			roleMethods[method.key.name] = method;
		}
		return roleMethods;
	}
	
	function roleDeclAsObj(roleDecl) {
		let roleMethods = roleDecl.body.body;
		let props = new Array(roleMethods.length);
		let methodBody;
		roleMethods.forEach(function(method, i) {
			//TODO is it actually necessary to copy the array here?
			//Was just trying to avoid modifying the original role declaration,
			//but that's being replaced anyhow...
			//
			//copy the method body array
			methodBody = t.BlockStatement(method.body.body.slice());
			
			//MAY NEED TO USE
			//PATH API TO INSERT THIS WITHOUT AN EXTRA NEWLINE IN THE GENERATED CODE
			
			//Allow `self` to be used as an alternative to `this`
			//(and without the scoping issues of `this`).
			//
			//var self: RolePlayerType = this;
			let selfId = t.Identifier('self');
			methodBody.body.unshift(t.VariableDeclaration('var', [
				t.VariableDeclarator(selfId, t.ThisExpression())
			]));
			
			props[i] = t.ObjectProperty(
				method.key,
				t.FunctionExpression(null, method.params, methodBody, method.generator, method.async)
			);
			//props[i] = t.ObjectMethod(method.kind, method.key, method.params, method.body, method.computed);
		});
		return t.ObjectExpression(props);
	}
	
	//Create objects for the role methods that can be passed to Object.defineProperties():
	/*
	Object.defineProperties(__context, {value: {
		__$[[roleName]]: {...},
		...
	}});
	*/
	function transformRolesToDescriptors(roleMethods, rolePaths) {
		let roleDescriptors = [];
		let valueId = t.Identifier('value');
		for (let rolePath of rolePaths) {
			let roleName = rolePath.node.id.name;			
			roleDescriptors.push(t.ObjectProperty(
				t.Identifier('__$' + roleName),
				t.ObjectExpression([
					t.ObjectProperty(valueId, roleDeclAsObj(rolePath.node))
				])
			));
		
			//transform call expressions within role methods
			transformCallExpressions(rolePath, roleMethods, roleName);
		}
		return roleDescriptors;
	}
	
	//Transform the contents of the Context function and Context methods
	function transformContextMethods(path, roleMethods, playerTypeAnnotations) {
		path.traverse({
			ExpressionStatement(subPath) {
				//TODO
				//This transformation should not happen inside inner classes or constructor
				//functions where `this` is not equal to the current context.
				//Maybe we don't even need a visitor for this and can just loop over
				//top-level statements...
				
				//Allow binding the current Context to a role via `this`, even if the Context
				//function wasn't called with the `new` operator.
				//
				//	myRole = this
				//becomes:
				//	myRole = __context
				
				let n = subPath.node;
				if (t.isAssignmentExpression(n.expression) && t.isIdentifier(n.expression.left)
					&& t.isThisExpression(n.expression.right)
				) {
					//role methods map is indexed by role name
					if (n.expression.left.name in roleMethods) {
						n.expression.right = t.Identifier('__context');
					}
				}
			},
			
			CallExpression: createCallExpressionVisitor(roleMethods),
			AssignmentExpression: createAssignmentExpressionVisitor(roleMethods, playerTypeAnnotations)
		});
	}
	
	//declare any role variables that haven't yet been declared
	function initRolePlayerVars(path, roleMethods) {
		let roleVarDeclarators = [];
		for (let roleName in roleMethods) {
			//has the role variable been declared?
			if (!path.scope.hasOwnBinding(roleName)) {
				roleVarDeclarators.push(t.VariableDeclarator(t.Identifier(roleName)));
			}
		}
		return roleVarDeclarators;
	}
	
	//Transform call statements
	//from [[roleName]].[[methodName]](...)
	//to __context.roles.[[roleName]].[[methodName]].call([[rolePlayer]], ...)
	function transformCallExpressions(path, roleMethods, currentRoleName) {
		path.traverse({
			CallExpression: createCallExpressionVisitor(roleMethods, currentRoleName)
		});
	}
	
	function createCallExpressionVisitor(roleMethods, currentRoleName) {
		return function(path) {
			let callee = path.node.callee;				
			if (callee.type === 'MemberExpression') {
				let roleId;
				let isRoleMethod = false;
			
				//TODO for `this`, only top-level statements should be transformed
				//(so `this` scoping works the same as it would normally)
				if (t.isThisExpression(callee.object) || (callee.object.type === 'Identifier' && callee.object.name === 'self')) {
					roleId = t.Identifier(currentRoleName);
					isRoleMethod = (callee.property.name in roleMethods[currentRoleName]);
				}
				//is it a role method?
				else if (callee.object.type === 'Identifier' && callee.object.name in roleMethods) {
					roleId = callee.object;
					isRoleMethod = (callee.property.name in roleMethods[callee.object.name]);
				}
				
				if (!roleId) {
					return;
				}
				
				let methodId = callee.property;
				
				if (isRoleMethod) {
					//TODO
					//Why is this causing an extra newline to be added?
					//This only happens if the variable names start with underscores (__context and __$...)
					
					//Transform role method call
					//__context.roles.[[roleName]].[[methodName]].call([[rolePlayer]], ...);
					path.replaceWith(t.CallExpression(
						//build expression resolving to call() method of role method
						t.MemberExpression(
							t.MemberExpression(
								t.MemberExpression(
									t.Identifier('__context'),
									t.Identifier('__$' + roleId.name)
								),
								methodId
							),
							t.Identifier('call')
						),
		
						//arguments
						[roleId].concat(path.node.arguments)
					));
				}
			}
		};
	}
	
	//Find role-binding statements (AKA role assignments) and keep track of bindings
	function createAssignmentExpressionVisitor(roleMethods, playerTypeAnnotations) {
		let roleBindingsExpr = t.MemberExpression(t.Identifier('__context'), t.Identifier('__roleBindings'));
		return function(path) {
			let node = path.node;
			if (t.isIdentifier(node.left) && (node.left.name in roleMethods)) {
				let roleId = node.left;
				
				//Keep track of role player types
				//Note: This would currently break in the case of role re-binding,
				//but role re-binding probably shouldn't be allowed anyway.
				let rhs = node.right;
				if (t.isIdentifier(rhs) && rhs.name != '__context') {
					let binding = path.scope.getBinding(rhs.name);
					if (!binding) {
						throw path.buildCodeFrameError("Undefined variable '" + rhs.name + "'");
					}
					
					if (binding.identifier.typeAnnotation) {
						playerTypeAnnotations[roleId.name] = binding.identifier.typeAnnotation;
					}
				}
				
				//__context.__roleBindings.[[roleName]] = [[player]]
				path.insertAfter(t.ExpressionStatement(t.AssignmentExpression(
					'=',
					t.MemberExpression(roleBindingsExpr, roleId),
					roleId
				)));
			}
		};
	}
	
	//Automatically bind any constructor (or Context function) parameters that have the
	//same names as roles.
	function automaticallyBindConstructorParams(fnParams, roleMethods, playerTypeAnnotations) {
		let assignments = [];
		let roleBindingsExpr = t.MemberExpression(t.Identifier('__context'), t.Identifier('__roleBindings'));
		for (let param of fnParams) {
			if (t.isIdentifier(param) && param.name in roleMethods) {
				let roleId = param;
				assignments.push(t.ExpressionStatement(t.AssignmentExpression(
					'=',
					t.MemberExpression(roleBindingsExpr, roleId),
					roleId
				)));
				
				//Keep track of role player types
				if (roleId.typeAnnotation) {
					playerTypeAnnotations[roleId.name] = roleId.typeAnnotation;
				}
			}
		}
		return assignments;
	}
	
	//Initialize the role bindings map.
	//Returns a variable declaration for the __roleBindings variable.
	function initRoleBindingsMap(rolePaths) {
		let roleBindingsId = t.Identifier('__roleBindings'),
			rolePlayerContractTypes = [],
			props = [],
			undef = t.Identifier('undefined');
			
		for (let rolePath of rolePaths) {			
			let roleId = rolePath.node.id,
				annotationId;
			if (rolePath.node.contract) {
				//type annotation (question mark indicates a "maybe type",
				//which is needed since role players are undefined prior to role binding)
				annotationId = t.Identifier('?__' + roleId.name + 'Contract');
			}
			else annotationId = t.Identifier('mixed');
				
			rolePlayerContractTypes.push(t.ObjectTypeProperty(roleId, annotationId));
			props.push(t.ObjectProperty(roleId, undef));
		}
		
		roleBindingsId.typeAnnotation = t.TypeAnnotation(
			t.ObjectTypeAnnotation([], rolePlayerContractTypes)
		);
		
		let roleBindingsMapInit = t.VariableDeclaration('var', [
			t.VariableDeclarator(roleBindingsId, t.ObjectExpression(props))
		]);
		return roleBindingsMapInit;
	}
	
	//Transform role-player contracts to flow type aliases
	function transformRolePlayerContracts(rolePaths) {
		let typeAliases = [];
		for (let rolePath of rolePaths) {
			let roleDecl = rolePath.node,
				contract = roleDecl.contract;
			if (contract) {
				let typeAlias = t.TypeAlias();
				typeAlias.id = t.Identifier('__' + roleDecl.id.name + 'Contract');
				contract.type = 'ObjectTypeAnnotation';
				typeAlias.right = contract;
				typeAliases.push(typeAlias);
			}
		}
		return typeAliases;
	}
}

//TEMP solution for babel-standalone
module.exports = exports.default;