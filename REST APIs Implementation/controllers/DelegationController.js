
var utils = require('../utils/writer.js');
var Delegations = require('../service/DelegationsService');
var constants = require('../utils/constants.js');

module.exports.issueDelegation = function issueDelegation (req, res, next) {
    console.log(req.params)
    console.log(req.body)
    if(req.params.filmId != req.body.filmId){
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The filmId field of the review object is different from the filmdId path parameter.' }], }, 409);
    }
    else {
      Delegations.issueDelegation(req.body, req.params.reviewerId, req.user.id)
      .then(function (response) {
        utils.writeJson(res, response, 201);
      })
      .catch(function (response) {
        if(response == 403){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
        }
        else if (response == 404){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'You are not a reviewer of this film' }], }, 404);
        }
        else if (response == 405){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review is completed' }], }, 405);
        }
        else if (response == 409){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user with ID reviewerId does not exist.' }], }, 409);
        }
        else if (response == 410){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Only one delegation' }], }, 410);
        }
        else if (response == 411){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'You are a delegated, you cannot delegate the review'}], }, 411);
        }
        else {
            utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
        }
      });
    }
};
module.exports.deleteDelegation = function deleteDelegation (req, res, next) {

    Delegations.deleteDelegation(req.params.filmId, req.params.reviewerId, req.params.delegatedId, req.user.id)
      .then(function (response) {
        utils.writeJson(res, response, 204);
      })
      .catch(function (response) {
        if(response == "403"){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not reviewer of the film' }], }, 403);
        }
        else if(response == "409"){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review has been already completed, so the delegation cannot be deleted anymore.' }], }, 409);
        }
        else if (response == 404){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The delegation does not exist.' }], }, 404);
        }
        else {
          utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
        }
      });
  };