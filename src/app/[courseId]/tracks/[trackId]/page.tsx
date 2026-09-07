import { redirect, notFound } from "next/navigation";
import { getAllCourses, getAllTracks, getTrack } from "@/lib/content";

interface TrackPageProps {
  params: {
    courseId: string;
    trackId: string;
  };
}

export function generateStaticParams() {
  const courses = getAllCourses();
  const params: { courseId: string; trackId: string }[] = [];

  for (const course of courses) {
    const tracks = getAllTracks(course.id);
    for (const track of tracks) {
      params.push({
        courseId: course.id,
        trackId: track.id,
      });
    }
  }

  return params;
}

export default function TrackPage({ params }: TrackPageProps) {
  const { courseId, trackId } = params;
  const track = getTrack(trackId, courseId);

  if (!track || !track.topicOrder || track.topicOrder.length === 0) {
    notFound();
  }

  // Redirect to the first topic of this track
  const firstTopicId = track.topicOrder[0];
  redirect(`/${courseId}/tracks/${track.id}/${firstTopicId}`);
}
