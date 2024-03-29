const mysql = require('mysql2/promise');

// 이미지 리스트 조회
const selectImageUrls = async (connection) => {
  return (await connection.query(`
  SELECT post_img.post_id, post_img.img_url
  FROM post, post_img
  WHERE post.post_id = post_img.post_id;`))[0]; // 이미지 리스트 반환 sql
}

// 게시글:이미지 = 1:N 매핑 (memoization)
// 게시글 리스트에 적용
const postListImgMapping = (posts, imgs) => {
  let url_memo = Array.from({ length: posts[posts.length - 1].post_id }, () => []); // 마지막 게시글의 post_id개의 빈 배열 생성
  for (let i = 0; i < imgs.length; i++) { // 이미지 리스트 순회
    const current_img_post_id = imgs[i].post_id; // 현재 탐색중인 이미지의 post_id
    if (current_img_post_id <= url_memo.length) { // 현재 탐색중인 이미지의 post_id가 마지막 게시글(질문글 or 자랑글)의 post_id를 초과하지 않을 때
      url_memo[current_img_post_id - 1].push(process.env.IMAGE_URL + imgs[i].img_url); // 게시글에 해당하는 메모 배열의 원소에 이미지 url 매핑
    }
  }

  for (let i = 0; i < posts.length; i++) {
    posts[i].img_url = url_memo[posts[i].post_id - 1]; // 게시글과 해당하는 메모 배열 매핑
  }
  return posts;
}

// 게시글:이미지 = 1:N 매핑
// 게시글에 적용
const postImgMapping = (post, imgs) => {
  post.img_url = []
  for (let i = 0; i < imgs.length; i++) {
    if (imgs[i].post_id == post.post_id) {
      post.img_url.push(process.env.IMAGE_URL + imgs[i].img_url);
    }
  }
  return post;
}

// 게시글 리스트 조회 sql
const get_post_list_sql = {
  // 질문글 리스트 조회 sql
  question_list_sql: (pet_tag, user_id) => {
    return mysql.format(`
    SELECT post.*, pet.pet_species, pet.pet_profile_img, user.user_nickname, post_title.post_title 
    FROM post, user, pet, post_title 
    WHERE post.user_id = user.user_id 
    and post.pet_id = pet.pet_id
    and post_title.post_id = post.post_id
    and post_type = 'QUESTION'
    and pet.pet_tag=?
    and post.post_id not in (SELECT post_id FROM post_hide WHERE user_id = ?);`,
      [pet_tag, user_id]);
  },
  // 자랑글 리스트 조회 sql
  boast_list_sql: (pet_tag, user_id) => {
    return mysql.format(`
      SELECT post.*, pet.pet_species, pet.pet_profile_img, user.user_nickname 
      FROM post, user, pet 
      WHERE post.user_id = user.user_id 
      and post.pet_id = pet.pet_id
      and post_type = 'BOAST'
      and pet.pet_tag=?
      and post.post_id not in (SELECT post_id FROM post_hide WHERE user_id = ?);`,
      [pet_tag, user_id]);
  },
}

// 게시글 조회 sql
const get_post_sql = {
  question_sql: (post_id) => {
    return mysql.format(`
      SELECT post.*, user.user_nickname, post_title.post_title
      FROM post, user, pet, post_title 
      WHERE post.user_id = user.user_id 
      and post.pet_id = pet.pet_id
      and post_title.post_id = post.post_id
      and post_type = 'QUESTION'
      and post.post_id=?;`,
      [post_id]);
  },
  boast_sql: (post_id) => {
    return mysql.format(`
      SELECT post.*, user.user_nickname 
      FROM post, user, pet
      WHERE post.user_id = user.user_id 
      and post.pet_id = pet.pet_id
      and post_type = 'BOAST'
      and post.post_id=?;`,
      [post_id]);
  }
}

// 게시글 리스트 조회
const selectPostList = async (connection, user_id, post_type, pet_tag) => {
  let post_sql = null;
  if (post_type == "QUESTION") { // 질문글
    post_sql = get_post_list_sql.question_list_sql(pet_tag, user_id);
  } else if (post_type == "BOAST") { // 자랑글
    post_sql = get_post_list_sql.boast_list_sql(pet_tag, user_id);
  }
  const posts = (await connection.query(post_sql))[0]; // 게시글 리스트
  const imgs = await selectImageUrls(connection); // 이미지 리스트
  let contents = []
  if (posts.length > 0) { // 게시글이 존재한다면
    contents = postListImgMapping(posts, imgs); // 게시글, 이미지 매핑
  }
  return contents; // 게시글 리스트 반환
}

// 게시글 댓글 리스트 반환
const getPostComments = async (connection, post_id) => {
  return (await connection.query(`
    SELECT post_comment.*, user.user_nickname 
    FROM post_comment, user 
    WHERE post_comment.post_id = ? and post_comment.user_id = user.user_id;
  `,
    [post_id]
  ))[0];
}

// 게시글 조회
const selectPost = async (connection, post_type, post_id) => {
  let post_sql = null;
  if (post_type == "QUESTION") { // 질문글
    post_sql = get_post_sql.question_sql(post_id);
  } else if (post_type == "BOAST") { // 자랑글
    post_sql = get_post_sql.boast_sql(post_id);
  }
  const post = (await connection.query(post_sql))[0][0]; // 게시글
  const imgs = await selectImageUrls(connection); // 이미지 리스트
  const contents = postImgMapping(post, imgs); // 게시글, 이미지 매핑
  contents.comments = await getPostComments(connection, post_id);; // 게시글에 작성된 댓글 리스트 삽입
  return contents; // 게시글 반환
}

// 생성할 게시글 id 반환 메서드
const getLastPostId = async (connection) => {
  let post_id = (await connection.query(
    `SELECT MAX(post_id)+1 FROM post;`
  ))[0][0]['MAX(post_id)+1']; // 가장 최신 게시글 id + 1 = 현재 작성할 게시글 id
  if (post_id == null) {
    post_id = 1; // 작성된 게시글이 없을 경우의 초기 게시글 식별자 = 1
  }
  return post_id;
}

const insert_post_sql = {
  // 게시글 삽입 sql
  post_sql: (post_id, params) => {
    return mysql.format(`
    INSERT INTO post 
    (post_id, pet_id, user_id, post_type, post_content) 
    VALUES (?, ?, ?, ?, ?); `,
      [post_id, params.pet_id, params.user_id, params.post_type, params.post_content]);
  },
  // 게시글 제목 삽입 sql
  post_title_sql: (post_id, post_title) => {
    return mysql.format(`
    INSERT INTO post_title 
    (post_id, post_title) 
    VALUES (?, ?);`,
      [post_id, post_title]);
  },
  // 이미지 경로 삽입 sql
  insertPostImgSql: (post_id, imagesPath) => {
    let post_img_sql = ""; // 이미지 경로 삽입 sql
    if (imagesPath) { // 이미지가 존재할 경우
      imagesPath.map((img_url) => {
        post_img_sql += mysql.format(`
        INSERT INTO post_img (post_id, img_url) VALUES (?, ?);`, // 쿼리문 생성
          [post_id, img_url]);
      });
    }
    return post_img_sql;
  }
}

// 게시글 생성
const createPost = async (connection, params) => {
  const post_id = await getLastPostId(connection); // 생성할 게시글 id
  let post_sql = insert_post_sql.post_sql(post_id, params);
  if (params.post_type == "QUESTION") { // 질문글의 경우
    post_sql += insert_post_sql.post_title_sql(post_id, params.post_title); // 게시글 제목 삽입 sql문 추가
  }
  const post_img_sql = insert_post_sql.insertPostImgSql(post_id, params.imagesPath); // 이미지 경로 삽입 sql

  const Rows = await connection.query(post_sql + post_img_sql);

  return Rows[0][0];
}

// 게시글 작성자 Id 반환
const getPostWriterId = async (connection, post_id) => {
  const query = mysql.format(`SELECT user_id FROM post WHERE post_id = ?;`, [post_id]);
  const Rows = await connection.query(query);
  return Rows[0][0];
}

const update_post_sql = {
  // 게시글 수정 sql
  update_post_sql: (post_id, contents) => {
    return mysql.format(`UPDATE post SET pet_id = ?, post_content = ?, updated_time = now() WHERE post_id = ?;`,
      [contents.pet_id, contents.post_content, post_id]);
  },
  // 게시글 제목 수정 sql
  update_post_title_sql: (post_id, post_title) => {
    return mysql.format(`UPDATE post_title SET post_title = ? WHERE post_id = ?;`,
      [post_title, post_id]);
  }
}

// 게시글 수정
const updatePost = async (connection, contents) => {
  await connection.query(deletePostImgSql(contents.content_id)); // 현재 게시글과 연관된 이미지들 삭제
  let update_sql = update_post_sql.update_post_sql(contents.content_id, contents);
  if (contents.post_type == "QUESTION") { // 질문글의 경우
    update_sql += update_post_sql.update_post_title_sql(contents.content_id, contents.post_title); // 게시글 제목 삽입 sql문 추가
  }
  const post_img_sql = insert_post_sql.insertPostImgSql(contents.content_id, contents.imagesPath); // 이미지 경로 삽입 sql

  const Rows = await connection.query(update_sql + post_img_sql);

  return Rows[0][0];
}

// 주어진 게시글에 해당하는 이미지들 삭제 sql
const deletePostImgSql = (post_id) => {
  return mysql.format(`DELETE FROM post_img WHERE post_id = ?;`, [post_id]);
}

// 게시글 삭제
const deletePost = async (connection, post_id) => {
  const delete_post_sql = mysql.format(`DELETE FROM post WHERE post_id = ?;`, [post_id]);
  const delete_post_title_sql = mysql.format(`DELETE FROM post_title WHERE post_id = ?;`, [post_id]);
  const delete_post_img_sql = deletePostImgSql(post_id);
  const delete_comment_sql = mysql.format(`
    DELETE FROM post_comment WHERE post_id = ?;
  `,
    [post_id]); // 게시글 댓글 삭제 sql
  const Rows = await connection.query(delete_post_sql + delete_post_title_sql + delete_post_img_sql + delete_comment_sql);

  return Rows[0][0];
}

// 키워드로 검색 sql
const search_post_list_sql = {
  // 질문글 검색결과 조회 sql
  search_question_list_sql: (pet_tag, keyword) => {
    return mysql.format(`
    SELECT post.*, pet.pet_species, pet.pet_profile_img, user.user_nickname, post_title.post_title 
    FROM post, user, pet, post_title 
    WHERE post.user_id = user.user_id 
    and post.pet_id = pet.pet_id
    and post_title.post_id = post.post_id
    and post_type = 'QUESTION'
    and pet.pet_tag = ?
    and (post_title.post_title like ? or post.post_content like ? or user.user_nickname like ? or pet.pet_species like ?);`, // 제목, 내용, 유저 닉네임, 펫 종에 따른 검색
      [pet_tag, keyword, keyword, keyword, keyword]);
  },
  // 자랑글 검색결과 조회 sql
  search_boast_list_sql: (pet_tag, keyword) => {
    return mysql.format(`
      SELECT post.*, pet.pet_species, pet.pet_profile_img, user.user_nickname 
      FROM post, user, pet 
      WHERE post.user_id = user.user_id 
      and post.pet_id = pet.pet_id
      and post_type = 'BOAST'
      and pet.pet_tag = ?
      and (post.post_content like ? or user.user_nickname like ? or pet.pet_species like ?);`, // 내용, 유저 닉네임, 펫 종에 따른 검색
      [pet_tag, keyword, keyword, keyword]);
  },
}

// 게시글 검색
const searchPostList = async (connection, keyword, post_type, pet_tag) => {
  let post_sql = null;
  keyword = '%' + keyword + '%'; // 키워드 와일드카드 형식으로 변경
  if (post_type == "QUESTION") { // 질문글
    post_sql = search_post_list_sql.search_question_list_sql(pet_tag, keyword);
  } else if (post_type == "BOAST") { // 자랑글
    post_sql = search_post_list_sql.search_boast_list_sql(pet_tag, keyword);
  }
  const posts = (await connection.query(post_sql))[0]; // 게시글 리스트
  const imgs = await selectImageUrls(connection); // 이미지 리스트
  const contents = postListImgMapping(posts, imgs); // 게시글, 이미지 매핑
  return contents; // 게시글 리스트 반환
}

// 게시글 댓글 개수 갱신 sql
const comment_count_update_sql = (post_id) => {
  return mysql.format(`
  UPDATE post SET comment_count = (select count(*) from post_comment where post_id = ?) WHERE post_id = ?;
  `,
    [post_id, post_id]
  );
}

// 댓글 작성
const createComment = async (connection, contents) => {
  const comment_sql = mysql.format(`
    INSERT into post_comment (post_id, user_id, comment_content, subordination) VALUES (?, ?, ?, ?);
  `,
    [contents.post_id, contents.user_id, contents.comment_content, contents.subordination]
  );
  const post_sql = comment_count_update_sql(contents.post_id); // 게시글 댓글 개수 업데이트

  const Rows = await connection.query(comment_sql + post_sql);

  return Rows[0][0];
}

// 댓글 작성자 Id 반환
const getCommentWriterId = async (connection, comment_id) => {
  const query = mysql.format(`SELECT user_id FROM post_comment WHERE comment_id = ?;`, [comment_id]);
  const Rows = await connection.query(query);
  return Rows[0][0];
}

// 댓글 수정
const updateComment = async (connection, contents) => {
  const Rows = await connection.query(`
    UPDATE post_comment SET comment_content = ?, updated_time = now() WHERE comment_id = ?;
  `,
    [contents.comment_content, contents.content_id]);

  return Rows[0][0];
}

// 댓글 삭제
const deleteComment = async (connection, contents) => {
  const delete_sql = mysql.format(`
    DELETE FROM post_comment WHERE comment_id = ?;
  `,
    [contents.content_id]); // 댓글 삭제
  const delete_child__sql = mysql.format(`
    DELETE FROM post_comment WHERE subordination = ?;
  `,
    [contents.content_id]); // 종속성이 있는 댓글(답글)들까지 같이 삭제
  const update_sql = comment_count_update_sql(contents.post_id); // 게시글 댓글 개수 업데이트

  const Rows = await connection.query(delete_sql + delete_child__sql + update_sql);

  return Rows[0][0];
}

// 게시글 신고
const reportPost = async (connection, post_id) => {
  const Rows = await connection.query(`
    UPDATE post SET report_count = report_count + 1 WHERE post_id = ?;
    SELECT report_count FROM post WHERE post_id = ?;
  `,
    [post_id, post_id]); // 게시글 신고 횟수 1 증가 후 반환

  return Rows[0][1]; // 누적된 게시글 신고 횟수 반환
}

// 게시글 숨기기
const hidePost = async (connection, user_id, post_id) => {
  const Rows = await connection.query(`
    INSERT INTO post_hide (user_id, post_id) VALUES (?, ?);
  `,
    [user_id, post_id]); // 숨김 게시글 추가

  return Rows[0][0];
}


module.exports = {
  selectPostList,
  selectPost,
  createPost,
  getPostWriterId,
  updatePost,
  deletePost,
  createComment,
  searchPostList,
  getCommentWriterId,
  updateComment,
  deleteComment,
  reportPost,
  hidePost,
};