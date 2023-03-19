const { pool } = require("../../../config/database");
const postDao = require("./postDao");

// Provider: Read 비즈니스 로직 처리

// 게시글 리스트 조회
exports.retrievePostList = async (post_type, pet_tag) => {
  const connection = await pool.getConnection(async (conn) => conn);

  let result = null;
  if (post_type == "QUESTION") { // 질문글
    result = await postDao.selectQuestionPostList(connection, pet_tag); // 질문글 리스트 조회
  } else if (post_type == "BOAST") { // 자랑글
    result = await postDao.selectBoastPostList(connection, pet_tag); // 자랑글 리스트 조회
  }

  connection.release();

  return result;
}

// 게시물 조회
exports.getPost = async (post_type, post_id) => {
  const connection = await pool.getConnection(async (conn) => conn);

  let result = null;
  if (post_type == "QUESTION") { // 질문글
    result = await postDao.selectQuestionPost(connection, post_id); // 질문글 조회
  } else if (post_type == "BOAST") { // 자랑글
    result = await postDao.selectBoastPost(connection, post_id); // 자랑글 조회
  }

  connection.release();

  return result;
}

exports.createPost = async (params) => {
  const connection = await pool.getConnection(async (conn) => conn);

  let result = null;
  if (params.post_type == "QUESTION") { // 질문글
    result = await postDao.createQustionPost(connection, params); // 질문글 생성
  } else if (params.post_type == "BOAST") { // 자랑글
    result = await postDao.createBoastPost(connection, params); // 자랑글 생성
  }

  connection.release();

  return result;
}