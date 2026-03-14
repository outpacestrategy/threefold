import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import CalendarScreen from '../screens/CalendarScreen';
import StatsScreen from '../screens/StatsScreen';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import CoachScreen from '../screens/CoachScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { focused: string; unfocused: string }> = {
  Calendar: { focused: 'calendar', unfocused: 'calendar-outline' },
  Stats: { focused: 'bar-chart', unfocused: 'bar-chart-outline' },
  Today: { focused: 'radio-button-on', unfocused: 'radio-button-off' },
  Insights: { focused: 'bulb', unfocused: 'bulb-outline' },
  Chat: { focused: 'chatbubble', unfocused: 'chatbubble-outline' },
};

export default function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Today"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.focused : icons.unfocused;
          return (
            <Ionicons
              name={iconName as any}
              size={22}
              color={focused ? '#1A1A1A' : '#A0A0A0'}
            />
          );
        },
        tabBarActiveTintColor: '#1A1A1A',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarStyle: {
          backgroundColor: '#FAF9F7',
          borderTopColor: '#EDEDEB',
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500' as const,
        },
      })}
    >
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Today" component={HomeScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Chat" component={CoachScreen} />
    </Tab.Navigator>
  );
}
