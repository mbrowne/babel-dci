//TEMP
const log = console.log;

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
import {parse} from "babylon";
const code = "(this===undefined || (typeof global !== 'undefined' && this === global) || (typeof window !== 'undefined' && this === window) ? {}: this)";
const initContextVariableAst = parse(code).program.body[0].expression;

export default function({types: t}) {
	//this makes it possible to create a ContextDeclaration visitor
	t.TYPES.push('ContextDeclaration');
	
	//Allow DCI node types to be traversed
	t.VISITOR_KEYS.RoleDeclaration = ['id', 'body'];
	t.VISITOR_KEYS.RoleDeclarationBody = ['body'];
	t.VISITOR_KEYS.RoleMethod = ['key', 'params', 'body', 'decorators', 'returnType', 'typeParameters'];
	t.VISITOR_KEYS.ContextDeclaration = ['id', 'body', 'decorators'];
	t.VISITOR_KEYS.ContextBody = ['body'];
	t.VISITOR_KEYS.ContextProperty = ['key', 'value', 'decorators'];
	t.VISITOR_KEYS.ContextMethod = ['key', 'params', 'body', 'decorators', 'returnType', 'typeParameters'];
	
	return {
		inherits: require("babel-plugin-syntax-dci"),
	
		visitor: {
			FunctionDeclaration: {
				exit(path) {
					let fnDecl = path.node;
					//2-dimensional map of role methods indexed by role name and then by method name
					let roleMethods = {};
					let rolePaths = [];
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
					
					//Create objects for the role methods
					let roleAssignments = [];
					for (let rolePath of rolePaths) {
						let roleName = rolePath.node.id.name;
						
						//__context.__$[[roleName]] = {...}
						roleAssignments.push(t.AssignmentExpression(
							'=',
							t.MemberExpression(t.Identifier('__context'), t.Identifier('__$' + roleName)),
							roleDeclAsObj(rolePath.node)
						));
					
						//transform call expressions within role methods
						transformCallExpressions(rolePath, roleMethods, roleName);
					}
					
					fnDecl.body.body = nodesToKeep;
					
					//Transform the contents of the Context function and Context methods
					path.get('body').traverse({
						ExpressionStatement(subPath) {
							//TODO
							//This transformation should not happen inside inner classes or constructor
							//functions where `this` is not equal to the current context.
							//Maybe we don't even need a visitor for this and can just loop over
							//top-level statements...
							
							//Allow binding the current Context to a role via `this`, even if the Context
							//function wasn't called with the `new` operator.
							//
							//For example,
							//	bank = this
							//becomes:
							//	bank = __context
							
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
						
						CallExpression: createCallExpressionVisitor(roleMethods)
					});
					
					//declare any role variables that haven't yet been declared
					let roleVarDeclarators = [];
					for (let roleName in roleMethods) {
						//has the role variable been declared?
						if (!path.scope.hasOwnBinding(roleName)) {
							roleVarDeclarators.push(t.VariableDeclarator(t.Identifier(roleName)));
						}
					}
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
					/*
					let ctxAssignment = t.VariableDeclaration('var', [
						t.VariableDeclarator(
							t.Identifier('__context'),
							t.ObjectExpression([])
						)
					]);
					*/
					
					//TODO
					//Inner contexts - generate unique context variable for each level?
					//e.g. var __context2 = ...
					
					//add initialization code to top of function declaration
					fnDecl.body.body = [ctxAssignment].concat(roleAssignments, fnDecl.body.body);
				}
			},
			
			ContextDeclaration: {
				exit(path) {
					let node = path.node;
					//log('hasConstructor', hasConstructor(node));
					
					let fnBodyNodes = [];
					
					//TEMP
					let params;
					let nodes = node.body.body;
					for (let n of nodes) {
					  if (n.kind === 'constructor') {
					    params = n.params;
						fnBodyNodes = n.body.body;
						break;
					  }
					}
					
					path.replaceWith(
						t.FunctionDeclaration(node.id, params, t.BlockStatement(fnBodyNodes))
					);
				}
			}
		}
	}
	
	function indexRoleMethodsByName(roleDecl) {
		let roleMethods = roleDecl.body.body;
		for (let m of roleMethods) {
			roleMethods[m.key.name] = m;
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
			//var self = this;
			methodBody.body.unshift(t.VariableDeclaration('var', [
				t.VariableDeclarator(t.Identifier('self'), t.ThisExpression())
			]));
			
			props[i] = t.ObjectProperty(
				method.key,
				t.FunctionExpression(null, method.params, methodBody, method.generator, method.async)
			);
			//props[i] = t.ObjectMethod(method.kind, method.key, method.params, method.body, method.computed);
		});
		return t.ObjectExpression(props);
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
		return function(subPath) {
			let callee = subPath.node.callee;				
			if (callee.type === 'MemberExpression') {
				let roleId;
			
				//TODO for `this`, only top-level statements should be transformed
				//(so `this` scoping works the same as it would normally)
				if ( (t.isThisExpression(callee.object) || (callee.object.type === 'Identifier' && callee.object.name === 'self'))
					&& (callee.property.name in roleMethods[currentRoleName])
				) {
					roleId = t.Identifier(currentRoleName);
				}
				else if (callee.object.type === 'Identifier' && callee.object.name in roleMethods
					&& callee.property.name in roleMethods[callee.object.name]
				) {
					roleId = callee.object;
				}
				
				if (!roleId) {
					return;
				}
				
				let methodId = callee.property;

				//TODO
				//Why is this causing an extra newline to be added?
				//This only happens if the variable names start with underscores (__context and __$...)

				//__context.roles.[[roleName]].[[methodName]].call([[rolePlayer]], ...);
				subPath.replaceWith(t.CallExpression(
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
					[roleId].concat(subPath.node.arguments)
				));
			}
		};
	}
	
	function hasConstructor(contextDecl) {
		let nodes = contextDecl.body.body;
		for (let n of nodes) {
		  if (n.kind === 'constructor') {
			return true;
		  }
		}
		return false;
	}
}

//TEMP solution for babel-standalone
module.exports = exports.default;