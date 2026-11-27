import { GUIDE_GROUPS } from './types';

export function createGuideNavigationGroups(): DocumentFragment {
  const groups = document.createDocumentFragment();

  for (const group of GUIDE_GROUPS) {
    const section = document.createElement('li');
    const label = document.createElement('span');
    label.id = `nav-guide-group-${group.id}`;
    label.className = 'nav-dropdown-group-label';
    label.textContent = group.title;

    const links = document.createElement('ul');
    links.className = 'nav-dropdown-group-links';
    links.setAttribute('aria-labelledby', label.id);

    for (const guide of group.guides) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#/guide/${guide.id}`;
      link.className = 'nav-dropdown-link';
      link.dataset.navRoute = `guide:${guide.id}`;
      link.dataset.navLabel = `${guide.icon} ${guide.shortLabel}`;
      link.textContent = link.dataset.navLabel;
      item.append(link);
      links.append(item);
    }

    section.append(label, links);
    groups.append(section);
  }

  return groups;
}
