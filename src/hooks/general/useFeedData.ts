import {useCallback, useEffect, useMemo, useState} from "react";

import {useYoutubeContext} from "../../context/YoutubeContext";
import Logger from "../../utils/Logger";
import {
  Helpers,
  YTNodes,
  Mixins,
  Innertube,
  IBrowseResponse,
} from "../../utils/Youtube";

import {parseArrayHorizontalData} from "@/extraction/ArrayExtraction";

const LOGGER = Logger.extend("FEED");

export function useFeedData(
  firstFeed: (youtube: Innertube) => Promise<Mixins.Feed<IBrowseResponse>>,
) {
  const youtube = useYoutubeContext();
  const [feed, setFeed] = useState<Mixins.Feed<IBrowseResponse>>();
  const [content, setContent] = useState<Helpers.YTNode[]>([]);

  useEffect(() => {
    if (!firstFeed || !youtube) {
      return;
    }
    firstFeed(youtube)
      .then(result => {
        LOGGER.debug("Result fetched ", result.page_contents.type);
        setContent(extractYTNodes(result.page_contents));
        setFeed(result);
      })
      .catch(LOGGER.warn);
  }, [youtube]);

  const contentFetched = useCallback(
    (node: Helpers.YTNode, reset?: boolean) => {
      if (reset) {
        setContent(extractYTNodes(node));
      } else {
        setContent([...content, ...extractYTNodes(node)]);
      }
    },
    [setContent, content],
  );

  const fetchMore = useCallback(async () => {
    LOGGER.debug("Fetch more!!!");
    if (!feed) {
      LOGGER.warn("No feed available");
      return;
    }
    if (!feed.has_continuation) {
      LOGGER.warn("No continuation available");
      return;
    }

    // LOGGER.debug("Feed: ", await feed.getContinuationData());

    const newFeed = await feed.getContinuation();

    LOGGER.debug("Feed content: ", newFeed.page_contents.type);

    const newValues = extractYTNodes(newFeed.page_contents);

    setContent([...content, ...newValues]);
    setFeed(newFeed);
  }, [feed, content]);

  useEffect(() => {
    if (feed && content.length < 10) {
      fetchMore().catch(LOGGER.warn);
    }
  }, [content, fetchMore, feed]);

  const parsedContent = useMemo(() => {
    return parseArrayHorizontalData(content);
  }, [content]);

  return {
    content,
    contentFetched,
    parsedContent,
    feed,
    setFeed,
    fetchMore,
  };
}

function extractYTNodes(node: Helpers.YTNode) {
  if (node.is(YTNodes.SectionList)) {
    return node.contents;
  } else if (node.is(YTNodes.RichGrid)) {
    return node.contents;
  } else {
    LOGGER.warn("Unknown type of Feed Node: ", node.type);
  }
  return [] as Helpers.YTNode[];
}
