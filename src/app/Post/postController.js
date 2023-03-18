const postService = require("./postService");
const baseResponse = require("../../../config/baseResponseStatus");
const { response, errResponse } = require("../../../config/response");
const { POST_TYPE } = require("./decsionPostType");

// GET
const output = {
    /*
    * API No. 1
    * API Name : 게시글 전체 조회 (동물/식물, 질문글/자랑글)
    * [GET] /posts/list?ptype&ptag
    */
    getPosts: async (req, res) => {
        return res.send(await postService.getPostsList(req.query.ptype, req.query.ptag)); 
    },
    /*
    * API No. 2
    * API Name : 게시글 조회
    * [GET] /posts/list?ptype&pid
    */
    getPost: async (req, res) => {
        return res.send(await postService.getPost(req.query.ptype, req.query.pid));
    },
}

// POST
const process = {
    /*
     * API No. 3
     * API Name : 게시물 생성(질문글)
     * [POST] /posts/question
     */
    postPostQuestion: async (req, res) => {
        // post type: 1 -> 질문글
        //const user_id = req.verifiedToken.userId; // 추후에 토큰에서 추출하도록 수정
        console.log(req.body)
        const pet_id = req.body.pet_id;
        const user_id = req.body.user_id;
        const post_title = req.body.post_title;
        const post_content = req.body.post_content;
        // const post_img_url_1 = req.body.post_img_url_1; // 이미지 저장 추후 구현
        // const post_img_url_2 = req.body.post_img_url_2;
        // const post_img_url_3 = req.body.post_img_url_3;
        // const post_img_url_4 = req.body.post_img_url_4;
        // const post_img_url_5 = req.body.post_img_url_5;
        
        
        const result = await postService.postPostQuestion(user_id, pet_id, post_title, post_content);

        // return 값 확인
        console.log("----------- return data -------------");
        console.log(result);
        console.log("-------------------------------------");

        return res.send(result);
    },
    /*
     * API No. 4
     * API Name : 게시물 생성(자랑글)
     * [POST] /posts/boast
     */
    postPostBoast: async (req, res) => {
        // post type: 2 -> 자랑글
        const user_id = req.verifiedToken.userId
        const pet_id = req.body.pet_id;
        const post_title = req.body.post_title;
        const post_content = req.body.post_content;
        const post_img_url_1 = req.body.post_img_url_1;
        const post_img_url_2 = req.body.post_img_url_2;
        const post_img_url_3 = req.body.post_img_url_3;
        const post_img_url_4 = req.body.post_img_url_4;
        const post_img_url_5 = req.body.post_img_url_5;

        const result = await postService.postPostQuestion(user_id, pet_id, post_title, post_content, post_img_url_1, post_img_url_2, post_img_url_3, post_img_url_4, post_img_url_5);

        // return 값 확인
        console.log("----------- return data -------------");
        console.log(result);
        console.log("-------------------------------------");

        return res.send(result);
    },
}


// 모듈 export
module.exports = {
    output,
    process,
};