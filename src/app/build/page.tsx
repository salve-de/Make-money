import { redirect } from 'next/navigation';

export default function BuildIndexPage() {
  redirect('/?mode=SYNTHESIS');
}
