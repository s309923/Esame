'use strict';

const Delegation = require('../components/delegation');
const User = require('../components/user');
const db = require('../components/db');
var constants = require('../utils/constants.js');


exports.issueDelegation = function(invitation, reviewerId, userId) {
    console.log(invitation)
  return new Promise((resolve, reject) => {
      const sql = "SELECT * FROM delegations WHERE filmId = ? AND reviewerId = ?";
      db.get(sql, [invitation.filmId, reviewerId], (err, row) => {
              if (err) {
                  reject(err);
              }
              else if (row && row.delegatedId == userId) {
                  reject(411);
              }
              else if (row) {
                  reject(410);
              } else {
                  const sql1 = "SELECT f.owner as owner, r.filmId as fid, r.reviewerId as rid, r.completed, r.reviewDate, r.rating, r.review FROM reviews r, films f WHERE f.id=filmId AND filmId = ? AND reviewerId = ?";
                  db.all(sql1, [invitation.filmId, reviewerId], (err, rows) => {
                      if (err) {
                          reject(err);
                      } else if (invitation.delegatedId == userId) {
                        reject(413);
                    } 
                      else if (rows.length === 0) {
                          reject(404);
                      }else if (userId != rows[0].rid) {
                        reject(404);
                    } else if (invitation.delegatedId == rows[0].owner) {
                        reject(412);
                    }
                      else if (reviewerId != rows[0].rid) {
                          reject(403);
                      } else if (rows[0].private == 1) {
                          reject(404);
                      }
                      else if (rows[0].completed == 1) {
                          reject(405);
                      }
                      else {
                          var temp = new Delegation(rows[0].fid, rows[0].rid, 0, rows[0].completed, rows[0].reviewDate, rows[0].rating, rows[0].review);
                          var sql2 = 'SELECT * FROM users WHERE id = ?';
                          db.all(sql2, invitation.delegatedId, async function (err, rows) {
                              if (err) {
                                  reject(err);
                              }
                              else if (rows.length !== 1) {
                                  reject(409);
                              }
                              else {
                                  temp.delegatedId = rows[0].id;
                                  console.log(temp)
                                  const sql3 = 'INSERT INTO delegations(filmId, reviewerId, delegatedId, completed, reviewDate, rating, review) VALUES(?,?,?,?,?,?,?)';
                                  db.run(sql3, [temp.filmId, temp.reviewerId, temp.delegatedId, temp.completed, temp.reviewDate, temp.rating, temp.review], function (err) {
                                      if (err) {
                                          reject('500');
                                      } else {
                                          var createdDelegation = new Delegation(temp.filmId, temp.reviewerId, temp.delegatedId, temp.completed, temp.reviewDate, temp.rating, temp.review);
                                          resolve(createdDelegation);
                                      }
                                  });
                              }
                          });
                      }
                  });
              }
          });
  });
}
exports.deleteDelegation = function(filmId,reviewerId,delegatedId,reviewer) {
    return new Promise((resolve, reject) => {
        const sql1 = "SELECT r.reviewerId, d.completed FROM delegations d, reviews r WHERE r.filmId = ? AND r.reviewerId = ? AND r.filmId=d.filmId AND r.reviewerId=d.reviewerId";
        db.all(sql1, [filmId, reviewerId], (err, rows) => {
            if (err)
                reject(err);
            else if (rows.length === 0)
                reject(404);
            else if(reviewer != rows[0].reviewerId) {
                console.log(rows)
                reject("403");
            }
            else if(rows[0].completed == 1) {
                reject("409");
            }
            else {
                const sql2 = 'DELETE FROM delegations WHERE filmId = ? AND reviewerId = ? AND delegatedId = ?';
                db.run(sql2, [filmId, reviewerId, delegatedId], (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve(null);
                })
            }
        });
    });
}