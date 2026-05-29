const BookmarkList = require('../models/BookmarkList');
const SurveyBookmark = require('../models/SurveyBookmark');
const Survey = require('../models/Survey');
const { isValidObjectId, toSurveyListResponse } = require('../utils/surveyUtils');

const DEFAULT_LIST_NAME = '목록1';
const DEFAULT_PAGE_SIZE = 6;

async function ensureDefaultBookmarkList(userId) {
  let firstList = await BookmarkList.findOne({ userId }).sort({ created_at: 1 }).lean();
  if (firstList) {
    return firstList;
  }

  const created = await BookmarkList.create({ userId, name: DEFAULT_LIST_NAME });
  return created.toObject();
}

async function listMyBookmarkLists(req, res) {
  const userId = req.user.userId;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  try {
    await ensureDefaultBookmarkList(userId);

    const lists = await BookmarkList.find({ userId }).sort({ created_at: 1 }).lean();
    const listIds = lists.map((list) => list._id);
    const counts = listIds.length > 0
      ? await SurveyBookmark.aggregate([
        { $match: { userId, listId: { $in: listIds } } },
        { $group: { _id: '$listId', count: { $sum: 1 } } }
      ])
      : [];

    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));

    return res.json({
      success: true,
      lists: lists.map((list, index) => ({
        id: list._id.toString(),
        name: list.name,
        isDefault: index === 0,
        bookmarkCount: countMap.get(list._id.toString()) || 0
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '목록을 불러오지 못했습니다.', error: error.message });
  }
}

async function createBookmarkList(req, res) {
  const userId = req.user.userId;
  const name = String(req.body.name || '').trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!name) {
    return res.status(400).json({ success: false, message: '목록 이름을 입력해주세요.' });
  }

  if (name.length > 24) {
    return res.status(400).json({ success: false, message: '목록 이름은 24자 이하로 입력해주세요.' });
  }

  try {
    const existing = await BookmarkList.findOne({ userId, name }).lean();
    if (existing) {
      return res.status(409).json({ success: false, message: '같은 이름의 목록이 이미 있습니다.' });
    }

    const created = await BookmarkList.create({ userId, name });
    return res.status(201).json({
      success: true,
      list: {
        id: created._id.toString(),
        name: created.name,
        isDefault: false,
        bookmarkCount: 0
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '목록 생성에 실패했습니다.', error: error.message });
  }
}

async function updateBookmarkList(req, res) {
  const userId = req.user.userId;
  const { listId } = req.params;
  const name = String(req.body.name || '').trim();

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!isValidObjectId(listId)) {
    return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
  }

  if (!name) {
    return res.status(400).json({ success: false, message: '목록 이름을 입력해주세요.' });
  }

  if (name.length > 24) {
    return res.status(400).json({ success: false, message: '목록 이름은 24자 이하로 입력해주세요.' });
  }

  try {
    const list = await BookmarkList.findOne({ _id: listId, userId });
    if (!list) {
      return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
    }

    const duplicate = await BookmarkList.findOne({ userId, name, _id: { $ne: listId } }).lean();
    if (duplicate) {
      return res.status(409).json({ success: false, message: '같은 이름의 목록이 이미 있습니다.' });
    }

    list.name = name;
    await list.save();

    const firstList = await BookmarkList.findOne({ userId }).sort({ created_at: 1 }).lean();

    return res.json({
      success: true,
      list: {
        id: list._id.toString(),
        name: list.name,
        isDefault: firstList ? firstList._id.toString() === list._id.toString() : false
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '목록 수정에 실패했습니다.', error: error.message });
  }
}

async function deleteBookmarkList(req, res) {
  const userId = req.user.userId;
  const { listId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!isValidObjectId(listId)) {
    return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
  }

  try {
    const list = await BookmarkList.findOne({ _id: listId, userId }).lean();
    if (!list) {
      return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
    }

    await Promise.all([
      SurveyBookmark.deleteMany({ userId, listId }),
      BookmarkList.deleteOne({ _id: listId, userId })
    ]);

    await ensureDefaultBookmarkList(userId);

    return res.json({ success: true, deletedListId: listId });
  } catch (error) {
    return res.status(500).json({ success: false, message: '목록 삭제에 실패했습니다.', error: error.message });
  }
}

async function listBookmarkedSurveysInList(req, res) {
  const userId = req.user.userId;
  const { listId } = req.params;
  const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!isValidObjectId(listId)) {
    return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
  }

  const normalizedPage = Number(page) || 1;
  const normalizedLimit = Number(limit) || DEFAULT_PAGE_SIZE;

  try {
    const list = await BookmarkList.findOne({ _id: listId, userId }).lean();
    if (!list) {
      return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
    }

    const filter = { userId, listId };
    const totalBookmarks = await SurveyBookmark.countDocuments(filter);
    const bookmarks = await SurveyBookmark.find(filter)
      .sort({ _id: -1 })
      .skip((normalizedPage - 1) * normalizedLimit)
      .limit(normalizedLimit)
      .lean();

    const surveyIds = bookmarks.map((bookmark) => bookmark.surveyId);
    const surveys = surveyIds.length > 0
      ? await Survey.find({ _id: { $in: surveyIds } }).lean()
      : [];

    const resolvedSurveys = await Promise.all(surveys.map((survey) => toSurveyListResponse(survey)));
    const surveyMap = new Map(
      resolvedSurveys.map((survey, index) => [surveys[index]._id.toString(), survey])
    );

    return res.json({
      success: true,
      list: {
        id: list._id.toString(),
        name: list.name
      },
      surveys: bookmarks
        .map((bookmark) => surveyMap.get(bookmark.surveyId.toString()))
        .filter(Boolean),
      page: normalizedPage,
      totalPages: Math.ceil(totalBookmarks / normalizedLimit),
      totalSurveys: totalBookmarks
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '목록 설문을 불러오지 못했습니다.', error: error.message });
  }
}

async function getSurveyBookmarkStatus(req, res) {
  const userId = req.user.userId;
  const { surveyId } = req.params;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' });
  }

  try {
    await ensureDefaultBookmarkList(userId);

    const [lists, bookmarks] = await Promise.all([
      BookmarkList.find({ userId }).sort({ created_at: 1 }).lean(),
      SurveyBookmark.find({ userId, surveyId }).select({ _id: 0, listId: 1 }).lean()
    ]);

    const bookmarkedListIds = new Set(bookmarks.map((bookmark) => bookmark.listId.toString()));

    return res.json({
      success: true,
      lists: lists.map((list, index) => ({
        id: list._id.toString(),
        name: list.name,
        isDefault: index === 0,
        isBookmarked: bookmarkedListIds.has(list._id.toString())
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '북마크 상태를 불러오지 못했습니다.', error: error.message });
  }
}

async function addSurveyBookmark(req, res) {
  const userId = req.user.userId;
  const { surveyId } = req.params;
  const requestedListId = req.body.listId;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' });
  }

  try {
    const survey = await Survey.findById(surveyId).select({ _id: 1 }).lean();
    if (!survey) {
      return res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' });
    }

    let list;
    if (requestedListId && isValidObjectId(requestedListId)) {
      list = await BookmarkList.findOne({ _id: requestedListId, userId }).lean();
      if (!list) {
        return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
      }
    } else {
      list = await ensureDefaultBookmarkList(userId);
    }

    const existing = await SurveyBookmark.findOne({ userId, surveyId, listId: list._id }).lean();
    if (existing) {
      return res.json({ success: true, message: '이미 북마크된 설문입니다.', listId: list._id.toString() });
    }

    await SurveyBookmark.create({ userId, surveyId, listId: list._id });
    return res.status(201).json({ success: true, message: '북마크에 추가되었습니다.', listId: list._id.toString() });
  } catch (error) {
    return res.status(500).json({ success: false, message: '북마크 추가에 실패했습니다.', error: error.message });
  }
}

async function removeSurveyBookmark(req, res) {
  const userId = req.user.userId;
  const { surveyId } = req.params;
  const requestedListId = req.body.listId;

  if (!userId) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  if (!isValidObjectId(surveyId)) {
    return res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' });
  }

  try {
    const deleteFilter = { userId, surveyId };

    if (requestedListId) {
      if (!isValidObjectId(requestedListId)) {
        return res.status(400).json({ success: false, message: '유효하지 않은 목록입니다.' });
      }

      const list = await BookmarkList.findOne({ _id: requestedListId, userId }).lean();
      if (!list) {
        return res.status(404).json({ success: false, message: '목록을 찾을 수 없습니다.' });
      }

      deleteFilter.listId = requestedListId;
    }

    const deleted = await SurveyBookmark.deleteMany(deleteFilter);
    return res.json({ success: true, removedCount: deleted.deletedCount || 0 });
  } catch (error) {
    return res.status(500).json({ success: false, message: '북마크 삭제에 실패했습니다.', error: error.message });
  }
}

module.exports = {
  listMyBookmarkLists,
  createBookmarkList,
  updateBookmarkList,
  deleteBookmarkList,
  listBookmarkedSurveysInList,
  getSurveyBookmarkStatus,
  addSurveyBookmark,
  removeSurveyBookmark
};
